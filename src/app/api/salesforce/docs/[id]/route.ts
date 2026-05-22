import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { orgDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = session.orgId || "unknown";

  const rows = await db
    .select()
    .from(orgDocuments)
    .where(and(eq(orgDocuments.id, id), eq(orgDocuments.orgId, orgId)))
    .limit(1);

  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = session.orgId || "unknown";

  await db
    .delete(orgDocuments)
    .where(and(eq(orgDocuments.id, id), eq(orgDocuments.orgId, orgId)));

  return Response.json({ success: true });
}
