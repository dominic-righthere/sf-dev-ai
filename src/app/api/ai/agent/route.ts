import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL, MAX_TOKENS } from "@/lib/ai/client";
import { createSSEStream } from "@/lib/ai/stream";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { createSalesforceMcpServer, TOOL_PRESETS, type ToolSet } from "@/lib/mcp/server";
import {
  createInMemoryMcpClient,
  executeMcpTool,
  getMcpToolsAsAnthropicTools,
} from "@/lib/mcp/client";
import { AGENT_SYSTEM_PROMPT } from "@/lib/ai/prompts/agent-system";
import { FLOW_SYSTEM_PROMPT } from "@/lib/ai/prompts/flow-system";
import { FLOW_REFINE_SYSTEM_PROMPT } from "@/lib/ai/prompts/flow-refine";
import { assembleFlowContext } from "@/lib/ai/context";
import { retrievalContextPrefix } from "@/lib/rag/pipeline";
import type { FlowDefinition } from "@/lib/flow/types";
import { deserializeFlowDefinition } from "@/lib/flow/types";

type AgentMode = "agent" | "flow_generate" | "flow_refine";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  const body = await request.json();
  const {
    prompt,
    conversationHistory = [],
    mode = "agent",
    toolsets: requestedToolsets,
    flowJson,
  } = body as {
    prompt: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    mode?: AgentMode;
    toolsets?: ToolSet[];
    flowJson?: string;
  };

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    let mcpCleanup: (() => Promise<void>) | null = null;
    try {
      const client = getAnthropicClient();
      const conn = createConnection(session);

      // Determine toolsets and system prompt based on mode
      let toolsets: ToolSet[];
      let systemPrompt: string;
      let contextPrefix = "";

      switch (mode) {
        case "flow_generate":
          toolsets = TOOL_PRESETS.flow;
          systemPrompt = FLOW_SYSTEM_PROMPT;
          contextPrefix = await assembleFlowContext(session.orgId || "");
          break;
        case "flow_refine": {
          toolsets = TOOL_PRESETS.flow;
          systemPrompt = FLOW_REFINE_SYSTEM_PROMPT;
          const currentFlow = flowJson
            ? deserializeFlowDefinition(flowJson)
            : undefined;
          contextPrefix = await assembleFlowContext(
            session.orgId || "",
            currentFlow
          );
          break;
        }
        default:
          toolsets = requestedToolsets || TOOL_PRESETS.agent;
          systemPrompt = AGENT_SYSTEM_PROMPT;
          // Ground the agent in the org's own documentation (no-op unless
          // embeddings are configured and documents have been indexed).
          contextPrefix = await retrievalContextPrefix(session.orgId || "", prompt);
      }

      // Track whether the agent should stop (e.g., clarification sent)
      let shouldStop = false;

      // Create MCP server with selected tools
      const mcpServer = createSalesforceMcpServer({
        getConnection: () => conn,
        toolsets,
        onEvent: (event, data) => send(event, data),
        onStopLoop: () => {
          shouldStop = true;
        },
      });

      // Create in-memory MCP client
      const { client: mcpClient, cleanup } =
        await createInMemoryMcpClient(mcpServer);
      mcpCleanup = cleanup;

      // Get tools in Anthropic format
      const tools = await getMcpToolsAsAnthropicTools(mcpClient);

      // Build messages
      const userContent = contextPrefix
        ? `${contextPrefix}\n\n---\n\n${mode === "flow_refine" ? "Modification request" : "User request"}: ${prompt}`
        : prompt;

      const messages: Array<{ role: "user" | "assistant"; content: any }> = [
        ...conversationHistory.slice(-10).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userContent },
      ];

      // Multi-turn tool execution loop
      let continueLoop = true;
      let currentMessages = messages;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let turns = 0;

      while (continueLoop && !shouldStop) {
        turns++;
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          tools: tools as any,
          messages: currentMessages as any,
        });

        // Track usage
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
          is_error?: boolean;
        }> = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            send("thinking", { text: block.text });
            send("assistant_message", { text: block.text });
          } else if (block.type === "tool_use") {
            // Execute tool via MCP
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

              // Send result events for data/metadata tools
              if (
                !result.isError &&
                !["set_flow_metadata", "emit_flow_element", "emit_flow_variable", "ask_clarification"].includes(block.name)
              ) {
                send("tool_result", {
                  toolName: block.name,
                  result: result.content,
                });
              }
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

        // Continue if tools were called and we should keep going
        if (
          !shouldStop &&
          continueLoop &&
          response.stop_reason === "tool_use" &&
          toolResults.length > 0
        ) {
          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content as any },
            { role: "user" as const, content: toolResults as any },
          ];
        } else {
          continueLoop = false;
        }
      }

      // Generation summary
      const estimatedCost =
        (totalInputTokens / 1_000_000) * 3 +
        (totalOutputTokens / 1_000_000) * 15;
      send("generation_summary", {
        totalInputTokens,
        totalOutputTokens,
        estimatedCost,
        turns,
      });

      close();
    } catch (err) {
      console.error("[ai/agent] Error:", err);
      send("error", {
        message: err instanceof Error ? err.message : "AI agent failed",
      });
      close();
    } finally {
      if (mcpCleanup) {
        await mcpCleanup().catch(() => {});
      }
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
