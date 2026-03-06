import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ objectName: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { objectName } = await params;
  const conn = createConnection(session);

  // Get describe + custom fields + validation rules in parallel
  const [describe, customFields, validationRules] = await Promise.all([
    conn.describe(objectName),
    conn.metadata
      .list([{ type: "CustomField", folder: objectName }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : []))
      .catch(() => []),
    conn.metadata
      .list([{ type: "ValidationRule", folder: objectName }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : []))
      .catch(() => []),
  ]);

  const fields = describe.fields.map((f) => ({
    name: f.name,
    label: f.label,
    type: f.type,
    length: f.length,
    precision: f.precision,
    scale: f.scale,
    required: !f.nillable && f.createable,
    unique: f.unique,
    custom: f.custom,
    createable: f.createable,
    updateable: f.updateable,
    calculated: f.calculated,
    externalId: f.externalId,
    defaultValue: f.defaultValue,
    referenceTo: f.referenceTo || [],
    relationshipName: f.relationshipName || null,
    picklistValues: (f.picklistValues || [])
      .filter((p) => p.active)
      .map((p) => ({
        value: p.value,
        label: p.label,
        default: p.defaultValue,
      })),
  }));

  const relationships = describe.childRelationships
    ?.filter((c) => c.relationshipName)
    .map((c) => ({
      childObject: c.childSObject,
      field: c.field,
      relationshipName: c.relationshipName,
    })) || [];

  return Response.json({
    name: describe.name,
    label: describe.label,
    labelPlural: describe.labelPlural,
    custom: describe.custom,
    keyPrefix: describe.keyPrefix,
    fields,
    relationships,
    customFieldMetadata: customFields.map((f: any) => ({
      fullName: f.fullName,
      lastModifiedDate: f.lastModifiedDate,
      lastModifiedByName: f.lastModifiedByName,
    })),
    validationRules: validationRules.map((v: any) => ({
      fullName: v.fullName,
      lastModifiedDate: v.lastModifiedDate,
      lastModifiedByName: v.lastModifiedByName,
    })),
    recordTypes: (describe.recordTypeInfos || []).map((r) => ({
      name: r.name,
      recordTypeId: r.recordTypeId,
      available: r.available,
      default: r.defaultRecordTypeMapping,
    })),
  });
}
