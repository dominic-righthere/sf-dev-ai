import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";

const fieldTypeEnum = z.enum([
  "Text",
  "Number",
  "Currency",
  "Percent",
  "Date",
  "DateTime",
  "Email",
  "Phone",
  "Url",
  "Checkbox",
  "Picklist",
  "MultiselectPicklist",
  "TextArea",
  "LongTextArea",
  "RichTextArea",
  "Lookup",
  "MasterDetail",
  "AutoNumber",
  "Formula",
]);

export function registerFieldOpsTools(
  server: McpServer,
  getConnection: () => Connection
) {
  server.tool(
    "create_custom_field",
    "Create a new custom field on a Salesforce object. Field API name will automatically get __c suffix.",
    {
      objectName: z.string().describe("SObject API name (e.g. Account, My_Object__c)"),
      fieldName: z
        .string()
        .describe("Field API name without __c suffix (e.g. Status, Priority_Level)"),
      label: z.string().describe("Field label visible to users"),
      type: fieldTypeEnum.describe("Field data type"),
      description: z.string().optional().describe("Field description"),
      required: z.boolean().optional().describe("Whether the field is required"),
      unique: z.boolean().optional().describe("Whether values must be unique"),
      length: z.number().optional().describe("Length for Text fields (default 255)"),
      precision: z.number().optional().describe("Precision for Number fields"),
      scale: z.number().optional().describe("Scale (decimal places) for Number fields"),
      picklistValues: z
        .array(z.string())
        .optional()
        .describe("Values for Picklist/MultiselectPicklist fields"),
      referenceTo: z
        .string()
        .optional()
        .describe("Related object for Lookup/MasterDetail fields"),
      formula: z.string().optional().describe("Formula expression for Formula fields"),
      formulaReturnType: z
        .enum(["Text", "Number", "Date", "DateTime", "Checkbox", "Currency", "Percent"])
        .optional()
        .describe("Return type for Formula fields"),
      defaultValue: z.string().optional().describe("Default value expression"),
      externalId: z.boolean().optional().describe("Mark as external ID"),
    },
    ANNOTATIONS.create,
    async (input) => {
      const conn = getConnection();
      const fullName = `${input.objectName}.${input.fieldName}__c`;

      const fieldMeta: Record<string, unknown> = {
        fullName,
        label: input.label,
        type: input.type,
        description: input.description || "",
      };

      // Type-specific config
      switch (input.type) {
        case "Text":
          fieldMeta.length = input.length || 255;
          break;
        case "Number":
        case "Currency":
        case "Percent":
          fieldMeta.precision = input.precision || 18;
          fieldMeta.scale = input.scale || 0;
          break;
        case "TextArea":
          break;
        case "LongTextArea":
        case "RichTextArea":
          fieldMeta.length = input.length || 32768;
          fieldMeta.visibleLines = 6;
          break;
        case "Picklist":
        case "MultiselectPicklist":
          if (input.picklistValues?.length) {
            fieldMeta.valueSet = {
              valueSetDefinition: {
                sorted: false,
                value: input.picklistValues.map((v, i) => ({
                  fullName: v,
                  label: v,
                  default: i === 0,
                })),
              },
            };
          }
          if (input.type === "MultiselectPicklist") {
            fieldMeta.visibleLines = 4;
          }
          break;
        case "Lookup":
        case "MasterDetail":
          if (!input.referenceTo) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `referenceTo is required for ${input.type} fields.`,
                },
              ],
              isError: true,
            };
          }
          fieldMeta.referenceTo = input.referenceTo;
          fieldMeta.relationshipName = input.fieldName;
          fieldMeta.relationshipLabel = input.label;
          if (input.type === "MasterDetail") {
            fieldMeta.writeRequiresMasterRead = false;
            fieldMeta.reparentableMasterDetail = false;
          }
          break;
        case "AutoNumber":
          fieldMeta.displayFormat = `{0000}`;
          fieldMeta.startingNumber = 1;
          break;
        case "Formula":
          if (!input.formula) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "formula is required for Formula fields.",
                },
              ],
              isError: true,
            };
          }
          fieldMeta.formula = input.formula;
          fieldMeta.formulaTreatBlanksAs = "BlankAsZero";
          if (input.formulaReturnType) {
            fieldMeta.type = input.formulaReturnType;
          }
          break;
      }

      if (input.required) fieldMeta.required = true;
      if (input.unique) fieldMeta.unique = true;
      if (input.externalId) fieldMeta.externalId = true;
      if (input.defaultValue) fieldMeta.defaultValue = input.defaultValue;

      const result = await conn.metadata.create("CustomField", fieldMeta as any);
      const results = Array.isArray(result) ? result : [result];
      const errors = results
        .filter((r: any) => !r.success)
        .flatMap((r: any) =>
          (r.errors || []).map((e: any) => e.message)
        );

      if (errors.length > 0) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${errors.join("; ")}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              fullName,
              message: `Custom field ${fullName} created successfully.`,
            }),
          },
        ],
      };
    }
  );

  server.tool(
    "update_custom_field",
    "Update an existing custom field's metadata.",
    {
      fullName: z
        .string()
        .describe("Full field name (e.g. Account.Status__c)"),
      label: z.string().optional().describe("New label"),
      description: z.string().optional().describe("New description"),
      required: z.boolean().optional().describe("New required setting"),
      picklistValues: z
        .array(z.string())
        .optional()
        .describe("New picklist values (replaces existing)"),
    },
    ANNOTATIONS.update,
    async (input) => {
      const conn = getConnection();
      const update: Record<string, unknown> = { fullName: input.fullName };

      if (input.label) update.label = input.label;
      if (input.description !== undefined) update.description = input.description;
      if (input.required !== undefined) update.required = input.required;
      if (input.picklistValues) {
        update.valueSet = {
          valueSetDefinition: {
            sorted: false,
            value: input.picklistValues.map((v, i) => ({
              fullName: v,
              label: v,
              default: i === 0,
            })),
          },
        };
      }

      const result = await conn.metadata.update("CustomField", update as any);
      const results = Array.isArray(result) ? result : [result];
      const errors = results
        .filter((r: any) => !r.success)
        .flatMap((r: any) =>
          (r.errors || []).map((e: any) => e.message)
        );

      if (errors.length > 0) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${errors.join("; ")}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Field ${input.fullName} updated.`,
            }),
          },
        ],
      };
    }
  );

  server.tool(
    "delete_custom_field",
    "Delete a custom field from a Salesforce object.",
    {
      fullName: z
        .string()
        .describe("Full field name (e.g. Account.Status__c)"),
    },
    ANNOTATIONS.delete,
    async ({ fullName }) => {
      const conn = getConnection();
      const result = await conn.metadata.delete("CustomField", fullName);
      const results = Array.isArray(result) ? result : [result];
      const errors = results
        .filter((r: any) => !r.success)
        .flatMap((r: any) =>
          (r.errors || []).map((e: any) => e.message)
        );

      if (errors.length > 0) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${errors.join("; ")}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Field ${fullName} deleted.`,
            }),
          },
        ],
      };
    }
  );

  server.tool(
    "create_validation_rule",
    "Create a validation rule on a Salesforce object.",
    {
      objectName: z.string().describe("SObject API name"),
      ruleName: z
        .string()
        .describe("Rule API name (no spaces, alphanumeric + underscores)"),
      errorConditionFormula: z
        .string()
        .describe("Formula that evaluates to TRUE when the record is INVALID"),
      errorMessage: z.string().describe("Error message shown when validation fails"),
      errorDisplayField: z
        .string()
        .optional()
        .describe("Field API name to display the error on (optional, defaults to top of page)"),
      active: z.boolean().optional().describe("Whether the rule is active (default true)"),
      description: z.string().optional().describe("Description of the rule"),
    },
    ANNOTATIONS.create,
    async (input) => {
      const conn = getConnection();
      const fullName = `${input.objectName}.${input.ruleName}`;

      const meta: Record<string, unknown> = {
        fullName,
        active: input.active !== false,
        errorConditionFormula: input.errorConditionFormula,
        errorMessage: input.errorMessage,
        description: input.description || "",
      };

      if (input.errorDisplayField) {
        meta.errorDisplayField = input.errorDisplayField;
      }

      const result = await conn.metadata.create("ValidationRule", meta as any);
      const results = Array.isArray(result) ? result : [result];
      const errors = results
        .filter((r: any) => !r.success)
        .flatMap((r: any) =>
          (r.errors || []).map((e: any) => e.message)
        );

      if (errors.length > 0) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${errors.join("; ")}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              fullName,
              message: `Validation rule ${fullName} created.`,
            }),
          },
        ],
      };
    }
  );

  server.tool(
    "update_validation_rule",
    "Update an existing validation rule.",
    {
      fullName: z.string().describe("Full rule name (e.g. Account.Require_Email)"),
      active: z.boolean().optional().describe("Activate or deactivate"),
      errorConditionFormula: z.string().optional().describe("New formula"),
      errorMessage: z.string().optional().describe("New error message"),
      description: z.string().optional().describe("New description"),
    },
    ANNOTATIONS.update,
    async (input) => {
      const conn = getConnection();
      const update: Record<string, unknown> = { fullName: input.fullName };

      if (input.active !== undefined) update.active = input.active;
      if (input.errorConditionFormula)
        update.errorConditionFormula = input.errorConditionFormula;
      if (input.errorMessage) update.errorMessage = input.errorMessage;
      if (input.description !== undefined) update.description = input.description;

      const result = await conn.metadata.update("ValidationRule", update as any);
      const results = Array.isArray(result) ? result : [result];
      const errors = results
        .filter((r: any) => !r.success)
        .flatMap((r: any) =>
          (r.errors || []).map((e: any) => e.message)
        );

      if (errors.length > 0) {
        return {
          content: [
            { type: "text" as const, text: `Failed: ${errors.join("; ")}` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Validation rule ${input.fullName} updated.`,
            }),
          },
        ],
      };
    }
  );
}
