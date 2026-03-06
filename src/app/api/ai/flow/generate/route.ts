import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { createSSEStream } from "@/lib/ai/stream";
import { FLOW_SYSTEM_PROMPT, FLOW_GENERATION_TOOLS } from "@/lib/ai/prompts/flow-system";
import { assembleFlowContext } from "@/lib/ai/context";
import { executeSchemaLookup } from "@/lib/ai/tools/schema-lookup";
import { sessionOptions, type SessionData } from "@/lib/session";
import { validateFlowElement, validateFlowVariable, validateFlowMetadata } from "@/lib/flow/validate";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  const body = await request.json();
  const { prompt, conversationHistory = [] } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  const { stream, send, close } = createSSEStream();

  // Run the AI generation in the background
  (async () => {
    try {
      const client = getAnthropicClient();
      const context = await assembleFlowContext(session.orgId || "");

      // Build messages
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: "user" as const, content: `${context}\n\n---\n\nUser request: ${prompt}` },
      ];

      // Multi-turn tool execution loop
      let continueLoop = true;
      let currentMessages = messages;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let turns = 0;

      while (continueLoop) {
        turns++;
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: FLOW_SYSTEM_PROMPT,
          tools: FLOW_GENERATION_TOOLS as any,
          messages: currentMessages as any,
        });

        // Track token usage
        if (response.usage) {
          totalInputTokens += response.usage.input_tokens;
          totalOutputTokens += response.usage.output_tokens;
          send("usage", {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          });
        }

        // Process content blocks
        const toolResults: Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
        }> = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            send("thinking", { text: block.text });
            send("assistant_message", { text: block.text });
          } else if (block.type === "tool_use") {
            const toolName = block.name;
            const toolInput = block.input as Record<string, unknown>;

            switch (toolName) {
              case "set_flow_metadata": {
                const metaValidation = validateFlowMetadata(toolInput);
                if (!metaValidation.valid) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Validation errors in flow metadata: ${metaValidation.errors.join("; ")}. Please fix and retry.`,
                    is_error: true,
                  } as any);
                } else {
                  send("flow_metadata", toolInput);
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: "Flow metadata set successfully.",
                  });
                }
                break;
              }

              case "emit_flow_element": {
                const elData = toolInput.element as Record<string, unknown>;
                const elValidation = validateFlowElement(elData);
                if (!elValidation.valid) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Validation errors in element "${elData.id || "unknown"}": ${elValidation.errors.join("; ")}. Please fix and re-emit.`,
                    is_error: true,
                  } as any);
                } else {
                  send("flow_element", elData);
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Element "${elData.id}" emitted successfully.`,
                  });
                }
                break;
              }

              case "emit_flow_variable": {
                const varData = toolInput.variable as Record<string, unknown>;
                const varValidation = validateFlowVariable(varData);
                if (!varValidation.valid) {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Validation errors in variable "${varData.name || "unknown"}": ${varValidation.errors.join("; ")}. Please fix and re-emit.`,
                    is_error: true,
                  } as any);
                } else {
                  send("flow_variable", varData);
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Variable "${varData.name}" emitted successfully.`,
                  });
                }
                break;
              }

              case "ask_clarification": {
                send("clarification", {
                  question: toolInput.question as string,
                  options: toolInput.options as string[] | undefined,
                  context: toolInput.context as string | undefined,
                });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: "Clarification question sent to user. Waiting for response.",
                });
                continueLoop = false;
                break;
              }

              case "lookup_schema": {
                const schemaResult = await executeSchemaLookup(
                  session,
                  toolInput.objectName as string
                );
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: schemaResult,
                });
                break;
              }

              default:
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: `Unknown tool: ${toolName}`,
                });
            }
          }
        }

        // If the AI wants to continue (called tools and stop_reason is tool_use), feed results back
        if (continueLoop && response.stop_reason === "tool_use" && toolResults.length > 0) {
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content as any },
            { role: "user" as const, content: toolResults as any },
          ];
        } else {
          continueLoop = false;
        }
      }

      // Send generation summary with cost estimate
      // Sonnet 4: $3/MTok input, $15/MTok output
      const estimatedCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
      send("generation_summary", {
        totalInputTokens,
        totalOutputTokens,
        estimatedCost,
        turns,
      });

      close();
    } catch (err) {
      console.error("[flow/generate] Error:", JSON.stringify(err, null, 2));
      send("error", {
        message: err instanceof Error ? err.message : "AI generation failed",
      });
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
