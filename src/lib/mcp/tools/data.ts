import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";

export function registerDataTools(
  server: McpServer,
  getConnection: () => Connection
) {
  server.tool(
    "run_soql_query",
    "Execute a SOQL query against the connected Salesforce org. SELECT queries only, capped at 200 records.",
    { soql: z.string().describe("SOQL query string (SELECT only)") },
    ANNOTATIONS.read,
    async ({ soql }) => {
      const trimmed = soql.trim();
      if (!/^SELECT\b/i.test(trimmed)) {
        return {
          content: [{ type: "text" as const, text: "Only SELECT queries are allowed." }],
          isError: true,
        };
      }

      const conn = getConnection();
      const result = await conn.query(trimmed, { maxFetch: 200 });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { totalSize: result.totalSize, records: result.records },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "count_records",
    "Count records matching a condition on a Salesforce object.",
    {
      objectName: z.string().describe("SObject API name"),
      where: z
        .string()
        .optional()
        .describe("Optional WHERE clause (without the WHERE keyword)"),
    },
    ANNOTATIONS.read,
    async ({ objectName, where }) => {
      const conn = getConnection();
      const soql = `SELECT COUNT() FROM ${objectName}${where ? ` WHERE ${where}` : ""}`;
      const result = await conn.query(soql);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ object: objectName, count: result.totalSize }),
          },
        ],
      };
    }
  );

  server.tool(
    "create_record",
    "Create a new record on a Salesforce object. Returns the created record ID.",
    {
      objectName: z.string().describe("SObject API name"),
      fields: z
        .record(z.string(), z.unknown())
        .describe("Field API name → value pairs for the new record"),
    },
    ANNOTATIONS.create,
    async ({ objectName, fields }) => {
      const conn = getConnection();
      const result = await conn.sobject(objectName).create(fields as any) as any;
      if (Array.isArray(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      }
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed: ${(result.errors || []).map((e: any) => e.message).join("; ")}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: result.id, success: true }),
          },
        ],
      };
    }
  );

  server.tool(
    "update_record",
    "Update an existing Salesforce record by ID.",
    {
      objectName: z.string().describe("SObject API name"),
      recordId: z.string().describe("18-character Salesforce record ID"),
      fields: z
        .record(z.string(), z.unknown())
        .describe("Field API name → new value pairs"),
    },
    ANNOTATIONS.update,
    async ({ objectName, recordId, fields }) => {
      const conn = getConnection();
      const result = await conn
        .sobject(objectName)
        .update({ Id: recordId, ...fields } as any) as any;
      if (Array.isArray(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      }
      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed: ${(result.errors || []).map((e: any) => e.message).join("; ")}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ success: true }) },
        ],
      };
    }
  );

  server.tool(
    "delete_record",
    "Delete a Salesforce record by ID.",
    {
      objectName: z.string().describe("SObject API name"),
      recordId: z.string().describe("18-character Salesforce record ID"),
    },
    ANNOTATIONS.delete,
    async ({ objectName, recordId }) => {
      const conn = getConnection();
      const result = await conn.sobject(objectName).destroy(recordId);
      if (Array.isArray(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      }
      if (!(result as any).success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed: ${((result as any).errors || []).map((e: any) => e.message).join("; ")}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ success: true }) },
        ],
      };
    }
  );
}
