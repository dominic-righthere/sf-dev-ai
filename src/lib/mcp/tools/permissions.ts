import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type Connection from "jsforce/lib/connection";
import { z } from "zod";
import { ANNOTATIONS } from "../annotations";

export function registerPermissionTools(
  server: McpServer,
  getConnection: () => Connection
) {
  server.tool(
    "list_permission_sets",
    "List all permission sets in the org.",
    {},
    ANNOTATIONS.read,
    async () => {
      const conn = getConnection();
      const result = await conn.metadata.list([{ type: "PermissionSet" }]);
      const items = Array.isArray(result) ? result : result ? [result] : [];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: items.length,
                permissionSets: items.map((p: any) => ({
                  fullName: p.fullName,
                  lastModifiedDate: p.lastModifiedDate,
                  lastModifiedByName: p.lastModifiedByName,
                  manageableState: p.manageableState,
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
    "list_profiles",
    "List all profiles in the org.",
    {},
    ANNOTATIONS.read,
    async () => {
      const conn = getConnection();
      const result = await conn.metadata.list([{ type: "Profile" }]);
      const items = Array.isArray(result) ? result : result ? [result] : [];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                count: items.length,
                profiles: items.map((p: any) => ({
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
    "read_permission_set",
    "Read full details of a permission set including object and field permissions.",
    {
      fullName: z.string().describe("Permission set API name"),
    },
    ANNOTATIONS.readSensitive,
    async ({ fullName }) => {
      const conn = getConnection();
      const result = await conn.metadata.read("PermissionSet", fullName);
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
    "read_profile",
    "Read full details of a profile including object and field permissions.",
    {
      fullName: z.string().describe("Profile API name"),
    },
    ANNOTATIONS.readSensitive,
    async ({ fullName }) => {
      const conn = getConnection();
      const result = await conn.metadata.read("Profile", fullName);
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
    "update_field_permissions",
    "Update field-level security on a permission set. Uses read-modify-write pattern.",
    {
      permissionSetName: z.string().describe("Permission set API name"),
      fieldPermissions: z
        .array(
          z.object({
            field: z
              .string()
              .describe("Field in Object.Field format (e.g. Account.Industry)"),
            readable: z.boolean().describe("Grant read access"),
            editable: z.boolean().describe("Grant edit access"),
          })
        )
        .describe("Array of field permission updates"),
    },
    ANNOTATIONS.update,
    async ({ permissionSetName, fieldPermissions }) => {
      const conn = getConnection();

      // Read current permission set
      const current = (await conn.metadata.read(
        "PermissionSet",
        permissionSetName
      )) as any;

      // Build updated field permissions map
      const existingPerms = new Map<string, any>();
      const currentFieldPerms = Array.isArray(current.fieldPermissions)
        ? current.fieldPermissions
        : current.fieldPermissions
          ? [current.fieldPermissions]
          : [];

      for (const fp of currentFieldPerms) {
        existingPerms.set(fp.field, fp);
      }

      // Apply updates
      for (const update of fieldPermissions) {
        existingPerms.set(update.field, {
          field: update.field,
          readable: update.readable,
          editable: update.editable,
        });
      }

      // Write back
      const updatePayload = {
        fullName: permissionSetName,
        fieldPermissions: Array.from(existingPerms.values()),
      };

      const result = await conn.metadata.update(
        "PermissionSet",
        updatePayload as any
      );
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
              message: `Updated ${fieldPermissions.length} field permissions on ${permissionSetName}.`,
            }),
          },
        ],
      };
    }
  );

  server.tool(
    "update_object_permissions",
    "Update object-level CRUD permissions on a permission set.",
    {
      permissionSetName: z.string().describe("Permission set API name"),
      objectPermissions: z
        .array(
          z.object({
            object: z.string().describe("SObject API name"),
            allowCreate: z.boolean(),
            allowRead: z.boolean(),
            allowEdit: z.boolean(),
            allowDelete: z.boolean(),
            viewAllRecords: z.boolean(),
            modifyAllRecords: z.boolean(),
          })
        )
        .describe("Array of object permission updates"),
    },
    ANNOTATIONS.update,
    async ({ permissionSetName, objectPermissions }) => {
      const conn = getConnection();

      const current = (await conn.metadata.read(
        "PermissionSet",
        permissionSetName
      )) as any;

      const existingPerms = new Map<string, any>();
      const currentObjPerms = Array.isArray(current.objectPermissions)
        ? current.objectPermissions
        : current.objectPermissions
          ? [current.objectPermissions]
          : [];

      for (const op of currentObjPerms) {
        existingPerms.set(op.object, op);
      }

      for (const update of objectPermissions) {
        existingPerms.set(update.object, update);
      }

      const updatePayload = {
        fullName: permissionSetName,
        objectPermissions: Array.from(existingPerms.values()),
      };

      const result = await conn.metadata.update(
        "PermissionSet",
        updatePayload as any
      );
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
              message: `Updated ${objectPermissions.length} object permissions on ${permissionSetName}.`,
            }),
          },
        ],
      };
    }
  );
}
