import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";

export function registerSchemaTools(
  server: McpServer,
  getConnection: () => Connection
) {
  server.tool(
    "describe_object",
    "Get full schema metadata for a Salesforce object including all fields, relationships, and record types.",
    {
      objectName: z
        .string()
        .describe("SObject API name (e.g. Account, Contact, Custom__c)"),
    },
    ANNOTATIONS.read,
    async ({ objectName }) => {
      const conn = getConnection();
      const result = await conn.describe(objectName);

      const fields = result.fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        length: f.length,
        required: !f.nillable && f.createable,
        unique: f.unique,
        custom: f.custom,
        referenceTo: f.referenceTo?.length ? f.referenceTo : undefined,
        relationshipName: f.relationshipName || undefined,
        picklistValues:
          f.picklistValues?.length
            ? f.picklistValues
                .filter((p) => p.active)
                .map((p) => ({ value: p.value, label: p.label }))
            : undefined,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                name: result.name,
                label: result.label,
                labelPlural: result.labelPlural,
                custom: result.custom,
                keyPrefix: result.keyPrefix,
                fieldCount: fields.length,
                fields,
                recordTypes: (result.recordTypeInfos || []).map((r) => ({
                  name: r.name,
                  recordTypeId: r.recordTypeId,
                  available: r.available,
                  default: r.defaultRecordTypeMapping,
                })),
                childRelationships: (result.childRelationships || [])
                  .filter((c) => c.relationshipName)
                  .map((c) => ({
                    childObject: c.childSObject,
                    field: c.field,
                    relationshipName: c.relationshipName,
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
    "list_objects",
    "List all Salesforce objects in the org. Returns name, label, custom flag, and key prefix.",
    {
      filter: z
        .enum(["all", "standard", "custom"])
        .optional()
        .describe("Filter by standard or custom objects (default: all)"),
    },
    ANNOTATIONS.read,
    async ({ filter }) => {
      const conn = getConnection();
      const result = await conn.describeGlobal();
      let objects = result.sobjects.map((o) => ({
        name: o.name,
        label: o.label,
        labelPlural: o.labelPlural,
        custom: o.custom,
        keyPrefix: o.keyPrefix,
        queryable: o.queryable,
        createable: o.createable,
        updateable: o.updateable,
      }));

      if (filter === "custom") {
        objects = objects.filter((o) => o.custom);
      } else if (filter === "standard") {
        objects = objects.filter((o) => !o.custom);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: objects.length, objects },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "search_objects",
    "Search Salesforce objects by name or label. Returns matching objects with their key fields.",
    {
      query: z.string().describe("Search term to match against object name or label"),
    },
    ANNOTATIONS.read,
    async ({ query }) => {
      const conn = getConnection();
      const result = await conn.describeGlobal();
      const q = query.toLowerCase();
      const matches = result.sobjects
        .filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.label.toLowerCase().includes(q)
        )
        .slice(0, 20)
        .map((o) => ({
          name: o.name,
          label: o.label,
          custom: o.custom,
          queryable: o.queryable,
        }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ query, matches }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "describe_field",
    "Get detailed metadata for a specific field on a Salesforce object.",
    {
      objectName: z.string().describe("SObject API name"),
      fieldName: z.string().describe("Field API name"),
    },
    ANNOTATIONS.read,
    async ({ objectName, fieldName }) => {
      const conn = getConnection();
      const result = await conn.describe(objectName);
      const field = result.fields.find(
        (f) => f.name.toLowerCase() === fieldName.toLowerCase()
      );

      if (!field) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Field '${fieldName}' not found on ${objectName}. Available fields: ${result.fields
                .slice(0, 20)
                .map((f) => f.name)
                .join(", ")}...`,
            },
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
                name: field.name,
                label: field.label,
                type: field.type,
                length: field.length,
                precision: field.precision,
                scale: field.scale,
                required: !field.nillable,
                unique: field.unique,
                custom: field.custom,
                createable: field.createable,
                updateable: field.updateable,
                calculated: field.calculated,
                externalId: field.externalId,
                defaultValue: field.defaultValue,
                referenceTo: field.referenceTo,
                relationshipName: field.relationshipName,
                picklistValues: field.picklistValues?.map((p) => ({
                  value: p.value,
                  label: p.label,
                  active: p.active,
                  default: p.defaultValue,
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
}
