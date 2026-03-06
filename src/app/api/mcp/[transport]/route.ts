import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import {
  createSalesforceMcpServer,
  TOOL_PRESETS,
} from "@/lib/mcp/server";
import {
  createInMemoryMcpClient,
  getMcpToolsAsAnthropicTools,
  executeMcpTool,
} from "@/lib/mcp/client";

/**
 * Stateless MCP-like endpoint for external tool callers.
 *
 * Accepts JSON-RPC–style requests:
 *   POST { method: "tools/list" }
 *   POST { method: "tools/call", params: { name: "run_soql_query", arguments: { soql: "..." } } }
 *
 * Authenticates via session cookie — each request gets its own jsforce connection.
 */

async function getSessionConnection() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.accessToken || !session.instanceUrl) return null;
  return createConnection(session);
}

export async function POST(request: Request) {
  const conn = await getSessionConnection();
  if (!conn) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Not authenticated" }, id: null },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { method, params, id } = body;

  const server = createSalesforceMcpServer({
    getConnection: () => conn,
    toolsets: TOOL_PRESETS.external,
  });

  const { client, cleanup } = await createInMemoryMcpClient(server);

  try {
    if (method === "tools/list") {
      const tools = await getMcpToolsAsAnthropicTools(client);
      return Response.json({ jsonrpc: "2.0", result: { tools }, id });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      if (!name) {
        return Response.json(
          { jsonrpc: "2.0", error: { code: -32602, message: "Missing tool name" }, id },
          { status: 400 }
        );
      }
      const result = await executeMcpTool(client, name, args || {});
      return Response.json({ jsonrpc: "2.0", result: { content: result }, id });
    }

    return Response.json(
      { jsonrpc: "2.0", error: { code: -32601, message: `Unknown method: ${method}` }, id },
      { status: 400 }
    );
  } finally {
    await cleanup();
  }
}

export async function GET() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Use POST with method: 'tools/list' or 'tools/call'" },
      id: null,
    },
    { status: 405 }
  );
}
