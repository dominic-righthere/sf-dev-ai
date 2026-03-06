import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";

const METADATA_TYPES = [
  "ApexClass",
  "ApexTrigger",
  "CustomField",
  "CustomObject",
  "Flow",
  "FlexiPage",
  "Layout",
  "PermissionSet",
  "Profile",
  "ValidationRule",
  "Workflow",
  "CustomTab",
  "CustomApplication",
  "CustomLabel",
  "StaticResource",
  "EmailTemplate",
  "Report",
  "Dashboard",
] as const;

export function registerMetadataTools(
  server: McpServer,
  getConnection: () => Connection
) {
  server.tool(
    "list_metadata",
    `List metadata components of a given type. Supported types: ${METADATA_TYPES.join(", ")}`,
    {
      metadataType: z
        .string()
        .describe("Metadata type (e.g. CustomField, Flow, ApexClass, PermissionSet)"),
      folder: z
        .string()
        .optional()
        .describe("Folder/object name for types that require it (e.g. object name for CustomField)"),
    },
    async ({ metadataType, folder }) => {
      const conn = getConnection();
      const queries: Array<{ type: string; folder?: string }> = [
        { type: metadataType, ...(folder ? { folder } : {}) },
      ];
      const result = await conn.metadata.list(queries);
      const items = Array.isArray(result) ? result : result ? [result] : [];

      const components = items.map((item: any) => ({
        fullName: item.fullName,
        type: item.type,
        fileName: item.fileName,
        lastModifiedDate: item.lastModifiedDate,
        lastModifiedByName: item.lastModifiedByName,
        createdDate: item.createdDate,
        createdByName: item.createdByName,
        manageableState: item.manageableState,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { type: metadataType, count: components.length, components },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "read_metadata",
    "Read full metadata for a specific component by type and full name.",
    {
      metadataType: z.string().describe("Metadata type"),
      fullName: z
        .string()
        .describe("Full name of the component (e.g. Account.Status__c, My_Flow)"),
    },
    async ({ metadataType, fullName }) => {
      const conn = getConnection();
      const result = await conn.metadata.read(metadataType as any, fullName);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "list_apex_classes",
    "List all Apex classes in the org with name, status, and body length.",
    {},
    async () => {
      const conn = getConnection();
      const result = await conn.tooling.query(
        "SELECT Id, Name, Status, LengthWithoutComments, ApiVersion, LastModifiedDate FROM ApexClass ORDER BY Name"
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: result.totalSize,
                classes: (result.records as any[]).map((r) => ({
                  id: r.Id,
                  name: r.Name,
                  status: r.Status,
                  length: r.LengthWithoutComments,
                  apiVersion: r.ApiVersion,
                  lastModified: r.LastModifiedDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "read_apex_class",
    "Read the full body of an Apex class.",
    { name: z.string().describe("Apex class name") },
    async ({ name }) => {
      const conn = getConnection();
      const result = await conn.tooling.query(
        `SELECT Id, Name, Body, ApiVersion FROM ApexClass WHERE Name = '${name.replace(/'/g, "\\'")}'`
      );
      const records = result.records as any[];
      if (records.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `Apex class '${name}' not found.` },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                name: records[0].Name,
                apiVersion: records[0].ApiVersion,
                body: records[0].Body,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "list_apex_triggers",
    "List all Apex triggers in the org.",
    {},
    async () => {
      const conn = getConnection();
      const result = await conn.tooling.query(
        "SELECT Id, Name, TableEnumOrId, Status, ApiVersion, LastModifiedDate FROM ApexTrigger ORDER BY Name"
      );
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: result.totalSize,
                triggers: (result.records as any[]).map((r) => ({
                  id: r.Id,
                  name: r.Name,
                  object: r.TableEnumOrId,
                  status: r.Status,
                  apiVersion: r.ApiVersion,
                  lastModified: r.LastModifiedDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "list_flexipages",
    "List all Lightning FlexiPages (App, Record, and Home pages) in the org.",
    {},
    async () => {
      const conn = getConnection();
      const result = await conn.metadata.list([{ type: "FlexiPage" }]);
      const items = Array.isArray(result) ? result : result ? [result] : [];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: items.length,
                pages: items.map((p: any) => ({
                  fullName: p.fullName,
                  lastModifiedDate: p.lastModifiedDate,
                  lastModifiedByName: p.lastModifiedByName,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "read_flexipage",
    "Read full metadata for a Lightning FlexiPage including layout, regions, and components.",
    { name: z.string().describe("FlexiPage full name") },
    async ({ name }) => {
      const conn = getConnection();
      const result = await conn.metadata.read("FlexiPage", name);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
