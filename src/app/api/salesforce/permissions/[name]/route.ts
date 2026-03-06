import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name } = await params;
  const conn = createConnection(session);

  // Determine if it's a PermissionSet or Profile from query param
  const type = request.nextUrl.searchParams.get("type") || "PermissionSet";
  const result = await conn.metadata.read(type as any, name);

  return Response.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name } = await params;
  const body = await request.json();
  const conn = createConnection(session);

  const type = body.type || "PermissionSet";
  const updatePayload = { ...body, fullName: name };
  delete updatePayload.type;

  const result = await conn.metadata.update(type, updatePayload as any);
  const results = Array.isArray(result) ? result : [result];
  const errors = results
    .filter((r: any) => !r.success)
    .flatMap((r: any) => (r.errors || []).map((e: any) => e.message));

  if (errors.length > 0) {
    return Response.json({ error: errors.join("; ") }, { status: 400 });
  }

  return Response.json({ success: true });
}
