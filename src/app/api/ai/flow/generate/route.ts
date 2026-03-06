import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { createSSEStream } from "@/lib/ai/stream";
import { FLOW_SYSTEM_PROMPT } from "@/lib/ai/prompts/flow-system";
import { assembleFlowContext } from "@/lib/ai/context";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { createSalesforceMcpServer, TOOL_PRESETS } from "@/lib/mcp/server";
import {
  createInMemoryMcpClient,
  executeMcpTool,
  getMcpToolsAsAnthropicTools,
} from "@/lib/mcp/client";

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

  (async () => {
    let mcpCleanup: (() => Promise<void>) | null = null;
    try {
      const anthropic = getAnthropicClient();
      const conn = createConnection(session);
      const context = await assembleFlowContext(session.orgId || "");

      let shouldStop = false;

      const mcpServer = createSalesforceMcpServer({
        getConnection: () => conn,
        toolsets: TOOL_PRESETS.flow,
        onEvent: (event, data) => send(event, data),
        onStopLoop: () => { shouldStop = true; },
      });

      const { client: mcpClient, cleanup } = await createInMemoryMcpClient(mcpServer);
      mcpCleanup = cleanup;

      const tools = await getMcpToolsAsAnthropicTools(mcpClient);

      const messages: Array<{ role: "user" | "assistant"; content: any }> = [
        ...conversationHistory.slice(-10),
        { role: "user" as const, content: `${context}\n\n---\n\nUser request: ${prompt}` },
      ];

      let continueLoop = true;
      let currentMessages = messages;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let turns = 0;

      while (continueLoop && !shouldStop) {
        turns++;
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: FLOW_SYSTEM_PROMPT,
          tools: tools as any,
          messages: currentMessages as any,
        });

        if (response.usage) {
          totalInputTokens += response.usage.input_tokens;
          totalOutputTokens += response.usage.output_tokens;
          send("usage", {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          });
        }

        const toolResults: Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
          is_error?: boolean;
        }> = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            send("thinking", { text: block.text });
            send("assistant_message", { text: block.text });
          } else if (block.type === "tool_use") {
            try {
              const result = await executeMcpTool(
                mcpClient,
                block.name,
                block.input as Record<string, unknown>
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result.content,
                ...(result.isError ? { is_error: true } : {}),
              });
            } catch (err) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Tool error: ${err instanceof Error ? err.message : "Unknown error"}`,
                is_error: true,
              });
            }
          }
        }

        if (!shouldStop && continueLoop && response.stop_reason === "tool_use" && toolResults.length > 0) {
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content as any },
            { role: "user" as const, content: toolResults as any },
          ];
        } else {
          continueLoop = false;
        }
      }

      const estimatedCost =
        (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;
      send("generation_summary", {
        totalInputTokens,
        totalOutputTokens,
        estimatedCost,
        turns,
      });

      close();
    } catch (err) {
      console.error("[flow/generate] Error:", err);
      send("error", {
        message: err instanceof Error ? err.message : "AI generation failed",
      });
      close();
    } finally {
      if (mcpCleanup) await mcpCleanup().catch(() => {});
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
