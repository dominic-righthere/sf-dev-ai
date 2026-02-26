import { describeObject } from "@/lib/salesforce/describe";
import { createConnection } from "@/lib/salesforce/connection";
import type { SessionData } from "@/lib/session";

export async function executeSchemaLookup(
  session: SessionData,
  objectName: string
): Promise<string> {
  if (!session.accessToken || !session.instanceUrl || !session.orgId) {
    return JSON.stringify({
      error: "Not connected to Salesforce",
      fields: [],
    });
  }

  try {
    const conn = createConnection(session);
    const describe = await describeObject(conn, session.orgId, objectName);

    // Return a concise summary for the AI
    const fieldSummary = describe.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: !f.nillable,
      reference: f.referenceTo.length > 0 ? f.referenceTo : undefined,
      picklist: f.picklistValues.length > 0
        ? f.picklistValues.filter((p) => p.active).map((p) => p.value)
        : undefined,
    }));

    return JSON.stringify({
      object: describe.name,
      label: describe.label,
      fields: fieldSummary,
    });
  } catch (err) {
    return JSON.stringify({
      error: `Failed to describe ${objectName}: ${err instanceof Error ? err.message : "Unknown error"}`,
      fields: [],
    });
  }
}
