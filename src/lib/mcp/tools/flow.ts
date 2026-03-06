import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Flow building tools for the AI agent. These don't use jsforce directly —
 * they emit structured data that the client-side flow store consumes via SSE.
 *
 * The send() callback is injected by the agent route to forward tool results
 * as SSE events to the browser.
 */
export function registerFlowTools(
  server: McpServer,
  onFlowEvent: (event: string, data: unknown) => void
) {
  server.tool(
    "set_flow_metadata",
    "Set the flow's metadata (API name, label, description, process type). Call this FIRST before emitting any elements.",
    {
      apiName: z
        .string()
        .describe("Salesforce API name (PascalCase with underscores)"),
      label: z.string().describe("Human-readable label"),
      description: z.string().describe("What the flow does"),
      processType: z
        .enum(["Screen", "AutoLaunchedFlow", "Flow"])
        .describe("Flow process type"),
    },
    async (input) => {
      onFlowEvent("flow_metadata", input);
      return {
        content: [
          { type: "text" as const, text: "Flow metadata set successfully." },
        ],
      };
    }
  );

  server.tool(
    "emit_flow_element",
    "Emit a single flow element. Call for each element in execution order. Each element connects to the next via the connector field.",
    {
      element: z
        .object({
          id: z.string(),
          type: z.enum([
            "Screen",
            "Decision",
            "Assignment",
            "RecordCreate",
            "RecordUpdate",
            "RecordLookup",
            "RecordDelete",
            "Loop",
            "ActionCall",
            "Subflow",
            "Wait",
          ]),
          name: z.string(),
          label: z.string(),
          description: z.string().optional(),
          connector: z
            .string()
            .optional()
            .describe("ID of the next element"),
          faultConnector: z
            .string()
            .optional()
            .describe("ID of the fault handler element"),
        })
        .passthrough()
        .describe("Flow element with type-specific properties"),
    },
    async ({ element }) => {
      onFlowEvent("flow_element", element);
      return {
        content: [
          {
            type: "text" as const,
            text: `Element "${element.id}" emitted successfully.`,
          },
        ],
      };
    }
  );

  server.tool(
    "emit_flow_variable",
    "Emit a flow variable. Call after set_flow_metadata.",
    {
      variable: z
        .object({
          name: z.string(),
          dataType: z.enum([
            "String",
            "Number",
            "Currency",
            "Boolean",
            "Date",
            "DateTime",
            "Picklist",
            "Multipicklist",
            "SObject",
            "Apex",
          ]),
          isCollection: z.boolean(),
          isInput: z.boolean(),
          isOutput: z.boolean(),
          objectType: z
            .string()
            .optional()
            .describe("SObject type when dataType is SObject"),
          description: z.string().optional(),
          defaultValue: z
            .object({
              stringValue: z.string().optional(),
              numberValue: z.number().optional(),
              booleanValue: z.boolean().optional(),
            })
            .optional(),
        })
        .describe("Flow variable definition"),
    },
    async ({ variable }) => {
      onFlowEvent("flow_variable", variable);
      return {
        content: [
          {
            type: "text" as const,
            text: `Variable "${variable.name}" emitted successfully.`,
          },
        ],
      };
    }
  );
}

/**
 * The ask_clarification tool — used across all agent contexts.
 */
export function registerInteractionTools(
  server: McpServer,
  onEvent: (event: string, data: unknown) => void,
  setStopLoop: () => void
) {
  server.tool(
    "ask_clarification",
    "Ask the user a clarifying question when the request is ambiguous. Provide options when possible.",
    {
      question: z.string().describe("The clarifying question"),
      options: z
        .array(z.string())
        .optional()
        .describe("Suggested answers the user can pick from"),
      context: z
        .string()
        .optional()
        .describe("Why you need clarification"),
    },
    async (input) => {
      onEvent("clarification", input);
      setStopLoop();
      return {
        content: [
          {
            type: "text" as const,
            text: "Clarification question sent to user. Waiting for response.",
          },
        ],
      };
    }
  );
}
