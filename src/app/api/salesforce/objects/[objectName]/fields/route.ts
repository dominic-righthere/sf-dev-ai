import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ objectName: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { objectName } = await params;
  const body = await request.json();
  const conn = createConnection(session);

  const fullName = `${objectName}.${body.fieldName}__c`;
  const fieldMeta: Record<string, unknown> = {
    fullName,
    label: body.label,
    type: body.type,
    description: body.description || "",
  };

  // Apply type-specific config
  switch (body.type) {
    case "Text":
      fieldMeta.length = body.length || 255;
      break;
    case "Number":
    case "Currency":
    case "Percent":
      fieldMeta.precision = body.precision || 18;
      fieldMeta.scale = body.scale || 0;
      break;
    case "LongTextArea":
    case "RichTextArea":
      fieldMeta.length = body.length || 32768;
      fieldMeta.visibleLines = 6;
      break;
    case "Picklist":
    case "MultiselectPicklist":
      if (body.picklistValues?.length) {
        fieldMeta.valueSet = {
          valueSetDefinition: {
            sorted: false,
            value: body.picklistValues.map((v: string, i: number) => ({
              fullName: v,
              label: v,
              default: i === 0,
            })),
          },
        };
      }
      if (body.type === "MultiselectPicklist") fieldMeta.visibleLines = 4;
      break;
    case "Lookup":
    case "MasterDetail":
      fieldMeta.referenceTo = body.referenceTo;
      fieldMeta.relationshipName = body.fieldName;
      fieldMeta.relationshipLabel = body.label;
      break;
  }

  if (body.required) fieldMeta.required = true;
  if (body.unique) fieldMeta.unique = true;
  if (body.externalId) fieldMeta.externalId = true;

  const result = await conn.metadata.create("CustomField", fieldMeta as any);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true, fullName });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ objectName: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const conn = createConnection(session);

  const result = await conn.metadata.update("CustomField", body as any);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ objectName: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const conn = createConnection(session);

  const result = await conn.metadata.delete("CustomField", body.fullName);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true });
}
