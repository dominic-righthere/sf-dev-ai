import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { createSSEStream } from "@/lib/ai/stream";
import { FLOW_SYSTEM_PROMPT, FLOW_GENERATION_TOOLS } from "@/lib/ai/prompts/flow-system";
import { assembleFlowContext } from "@/lib/ai/context";
import { executeSchemaLookup } from "@/lib/ai/tools/schema-lookup";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

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
      const context = assembleFlowContext(session.orgId || "");

      // Build messages
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: "user" as const, content: `${context}\n\n---\n\nUser request: ${prompt}` },
      ];

      // Multi-turn tool execution loop
      let continueLoop = true;
      let currentMessages = messages;

      while (continueLoop) {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: FLOW_SYSTEM_PROMPT,
          tools: FLOW_GENERATION_TOOLS as any,
          messages: currentMessages as any,
        });

        // Process content blocks
        const toolResults: Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
        }> = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            send("thinking", { text: block.text });
          } else if (block.type === "tool_use") {
            const toolName = block.name;
            const toolInput = block.input as Record<string, unknown>;

            switch (toolName) {
              case "set_flow_metadata":
                send("flow_metadata", toolInput);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: "Flow metadata set successfully.",
                });
                break;

              case "emit_flow_element":
                send("flow_element", toolInput.element as Record<string, unknown>);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: `Element "${(toolInput.element as any).id}" emitted successfully.`,
                });
                break;

              case "emit_flow_variable":
                send("flow_variable", toolInput.variable as Record<string, unknown>);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: `Variable "${(toolInput.variable as any).name}" emitted successfully.`,
                });
                break;

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
        if (response.stop_reason === "tool_use" && toolResults.length > 0) {
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content as any },
            { role: "user" as const, content: toolResults as any },
          ];
        } else {
          continueLoop = false;
        }
      }

      close();
    } catch (err) {
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
