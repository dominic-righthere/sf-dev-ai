import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Create an in-memory MCP client connected to an MCP server.
 * Used by AI agent routes to execute tools without HTTP roundtrips.
 *
 * Returns the client and a cleanup function.
 */
export async function createInMemoryMcpClient(
  server: McpServer
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client({ name: "sf-dev-ai-agent", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

/**
 * Execute an MCP tool call via the in-memory client.
 * Returns the text content from the tool result.
 */
export async function executeMcpTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: string; isError?: boolean }> {
  const result = await client.callTool({ name: toolName, arguments: args });
  const textContent = (result.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return {
    content: textContent,
    isError: result.isError === true,
  };
}

/**
 * List all available tools from the MCP server and convert to Anthropic tool format.
 */
export async function getMcpToolsAsAnthropicTools(
  client: Client
): Promise<
  Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>
> {
  const { tools } = await client.listTools();
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || "",
    input_schema: tool.inputSchema as Record<string, unknown>,
  }));
}
