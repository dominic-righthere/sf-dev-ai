import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { orgConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken } from "@/lib/salesforce/auth";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.appUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orgConnectionId } = body;

  if (!orgConnectionId) {
    return NextResponse.json({ error: "orgConnectionId required" }, { status: 400 });
  }

  const [connection] = await db
    .select()
    .from(orgConnections)
    .where(
      and(
        eq(orgConnections.id, orgConnectionId),
        eq(orgConnections.appUserId, session.appUserId),
        eq(orgConnections.isActive, true)
      )
    )
    .limit(1);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const refreshToken = decrypt(connection.refreshToken);
    const { accessToken, issuedAt } = await refreshAccessToken(
      refreshToken,
      connection.orgType as "production" | "sandbox"
    );

    // Update session with new org
    session.accessToken = accessToken;
    session.instanceUrl = connection.instanceUrl;
    session.orgId = connection.orgId;
    session.sfUserId = connection.sfUserId;
    session.username = connection.username;
    session.displayName = connection.displayName;
    session.orgType = connection.orgType as "production" | "sandbox";
    session.issuedAt = typeof issuedAt === "string" ? parseInt(issuedAt, 10) : Date.now();
    session.orgConnectionId = connection.id;
    await session.save();

    await db
      .update(orgConnections)
      .set({ lastUsedAt: new Date() })
      .where(eq(orgConnections.id, connection.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "refresh_failed" }, { status: 422 });
  }
}
