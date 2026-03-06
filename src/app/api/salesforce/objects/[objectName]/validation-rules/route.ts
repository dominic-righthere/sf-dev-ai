import { NextRequest } from "next/server";
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

  // List validation rules for this object
  const listed = await conn.metadata.list([
    { type: "ValidationRule", folder: objectName },
  ]);
  const items = Array.isArray(listed) ? listed : listed ? [listed] : [];

  if (items.length === 0) {
    return Response.json({ rules: [] });
  }

  // Read full metadata for each rule
  const fullNames = items.map((i: any) => i.fullName);
  const metadata = await conn.metadata.read("ValidationRule", fullNames);
  const rules = Array.isArray(metadata) ? metadata : [metadata];

  return Response.json({
    rules: rules.map((r: any) => ({
      fullName: r.fullName,
      active: r.active,
      description: r.description,
      errorConditionFormula: r.errorConditionFormula,
      errorMessage: r.errorMessage,
      errorDisplayField: r.errorDisplayField,
    })),
  });
}

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

  const fullName = `${objectName}.${body.ruleName}`;
  const meta = {
    fullName,
    active: body.active !== false,
    errorConditionFormula: body.errorConditionFormula,
    errorMessage: body.errorMessage,
    description: body.description || "",
    ...(body.errorDisplayField ? { errorDisplayField: body.errorDisplayField } : {}),
  };

  const result = await conn.metadata.create("ValidationRule", meta as any);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true, fullName });
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const conn = createConnection(session);

  const result = await conn.metadata.update("ValidationRule", body as any);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true });
}
