import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { createSSEStream } from "@/lib/ai/stream";
import { FLOW_REFINE_SYSTEM_PROMPT } from "@/lib/ai/prompts/flow-refine";
import { FLOW_GENERATION_TOOLS } from "@/lib/ai/prompts/flow-system";
import { assembleFlowContext } from "@/lib/ai/context";
import { executeSchemaLookup } from "@/lib/ai/tools/schema-lookup";
import { sessionOptions, type SessionData } from "@/lib/session";
import type { FlowDefinition } from "@/lib/flow/types";
import { deserializeFlowDefinition } from "@/lib/flow/types";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const body = await request.json();
  const { prompt, flowJson, conversationHistory = [] } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  if (!flowJson) {
    return new Response(JSON.stringify({ error: "Current flow state is required" }), {
      status: 400,
    });
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      const client = getAnthropicClient();
      const currentFlow = deserializeFlowDefinition(flowJson);
      const context = assembleFlowContext(session.orgId || "", currentFlow);

      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...conversationHistory.slice(-10),
        {
          role: "user" as const,
          content: `${context}\n\n---\n\nModification request: ${prompt}`,
        },
      ];

      let continueLoop = true;
      let currentMessages = messages;

      while (continueLoop) {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: FLOW_REFINE_SYSTEM_PROMPT,
          tools: FLOW_GENERATION_TOOLS as any,
          messages: currentMessages as any,
        });

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
                  content: "Flow metadata updated successfully.",
                });
                break;

              case "emit_flow_element":
                send("flow_element", toolInput.element as Record<string, unknown>);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: `Element "${(toolInput.element as any).id}" updated successfully.`,
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
        message: err instanceof Error ? err.message : "AI refinement failed",
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
