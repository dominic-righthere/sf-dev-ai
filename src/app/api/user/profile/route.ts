import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { orgConnections } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.appUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await db
    .select({
      id: orgConnections.id,
      orgId: orgConnections.orgId,
      sfUserId: orgConnections.sfUserId,
      username: orgConnections.username,
      displayName: orgConnections.displayName,
      instanceUrl: orgConnections.instanceUrl,
      orgType: orgConnections.orgType,
      orgLabel: orgConnections.orgLabel,
      connectedAt: orgConnections.connectedAt,
      lastUsedAt: orgConnections.lastUsedAt,
    })
    .from(orgConnections)
    .where(
      and(
        eq(orgConnections.appUserId, session.appUserId),
        eq(orgConnections.isActive, true)
      )
    )
    .orderBy(desc(orgConnections.lastUsedAt));

  return NextResponse.json({
    appUserId: session.appUserId,
    currentOrgConnectionId: session.orgConnectionId,
    orgs,
  });
}
