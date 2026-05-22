import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { orgConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.appUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connectionId } = await params;
  const body = await request.json();
  const { orgLabel } = body;

  const [updated] = await db
    .update(orgConnections)
    .set({ orgLabel: orgLabel ?? null })
    .where(
      and(
        eq(orgConnections.id, connectionId),
        eq(orgConnections.appUserId, session.appUserId)
      )
    )
    .returning({ id: orgConnections.id });

  if (!updated) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.appUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { connectionId } = await params;

  const [updated] = await db
    .update(orgConnections)
    .set({ isActive: false })
    .where(
      and(
        eq(orgConnections.id, connectionId),
        eq(orgConnections.appUserId, session.appUserId)
      )
    )
    .returning({ id: orgConnections.id });

  if (!updated) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
