import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { registerDataTools } from "./tools/data";
import { registerSchemaTools } from "./tools/schema";
import { registerMetadataTools } from "./tools/metadata";
import { registerFieldOpsTools } from "./tools/field-ops";
import { registerPermissionTools } from "./tools/permissions";
import { registerFlowTools, registerInteractionTools } from "./tools/flow";
import { registerGovernanceTools, type OrgContext } from "./tools/governance";
import { registerApexTools } from "./tools/apex";
import { registerRagTools } from "./tools/rag";

export type ToolSet =
  | "data"
  | "schema"
  | "metadata"
  | "field_ops"
  | "permissions"
  | "governance"
  | "apex"
  | "flow"
  | "interaction"
  | "rag";

const ALL_TOOLSETS: ToolSet[] = [
  "data",
  "schema",
  "metadata",
  "field_ops",
  "permissions",
];

/**
 * Create a Salesforce MCP server with the specified tool sets.
 *
 * For the HTTP endpoint (external clients), pass all toolsets.
 * For the AI agent, pass specific toolsets based on context.
 */
export function createSalesforceMcpServer(options: {
  getConnection: () => Connection;
  toolsets?: ToolSet[];
  /** Callback for flow/interaction events (SSE forwarding) */
  onEvent?: (event: string, data: unknown) => void;
  /** Callback to stop the agent loop (for clarification) */
  onStopLoop?: () => void;
  /**
   * Org context for governance tools (orgId + orgType). Required if
   * "governance" is in toolsets; otherwise optional. Constant for stdio
   * (resolved once at boot), dynamic for the in-app agent route.
   */
  getOrgContext?: () => OrgContext;
}): McpServer {
  const {
    getConnection,
    toolsets = ALL_TOOLSETS,
    onEvent,
    onStopLoop,
    getOrgContext,
  } = options;

  const server = new McpServer({
    name: "sf-dev-ai",
    version: "1.0.0",
  });

  for (const toolset of toolsets) {
    switch (toolset) {
      case "data":
        registerDataTools(server, getConnection);
        break;
      case "schema":
        registerSchemaTools(server, getConnection);
        break;
      case "metadata":
        registerMetadataTools(server, getConnection);
        break;
      case "field_ops":
        registerFieldOpsTools(server, getConnection);
        break;
      case "permissions":
        registerPermissionTools(server, getConnection);
        break;
      case "governance":
        if (getOrgContext) {
          registerGovernanceTools(server, getConnection, getOrgContext);
        }
        break;
      case "apex":
        registerApexTools(server, getConnection);
        break;
      case "flow":
        if (onEvent) {
          registerFlowTools(server, onEvent);
        }
        break;
      case "interaction":
        if (onEvent && onStopLoop) {
          registerInteractionTools(server, onEvent, onStopLoop);
        }
        break;
      case "rag":
        if (getOrgContext) {
          registerRagTools(server, getOrgContext);
        }
        break;
    }
  }

  return server;
}

/**
 * Preset tool compositions for different contexts.
 */
export const TOOL_PRESETS = {
  /** External MCP clients get all non-flow tools, including governance + apex. */
  external: [
    "data",
    "schema",
    "metadata",
    "field_ops",
    "permissions",
    "governance",
    "apex",
    "rag",
  ] as ToolSet[],
  /** Flow generation/refinement */
  flow: ["schema", "flow", "interaction"] as ToolSet[],
  /** General agent (objects, permissions, query pages, governance feedback loop) */
  agent: [
    "data",
    "schema",
    "metadata",
    "field_ops",
    "permissions",
    "governance",
    "apex",
    "interaction",
  ] as ToolSet[],
  /** Query page agent */
  query: ["data", "schema", "interaction"] as ToolSet[],
};
