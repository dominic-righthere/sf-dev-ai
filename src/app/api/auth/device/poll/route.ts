import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { pollDeviceToken, getUserInfo } from "@/lib/salesforce/auth";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { appUsers, orgConnections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceCode, orgType } = body;

  if (!deviceCode || typeof deviceCode !== "string") {
    return NextResponse.json({ error: "deviceCode is required" }, { status: 400 });
  }

  if (!orgType || !["production", "sandbox"].includes(orgType)) {
    return NextResponse.json({ error: "Invalid org type" }, { status: 400 });
  }

  try {
    const result = await pollDeviceToken(deviceCode, orgType);

    if (result.status === "pending") {
      return NextResponse.json({ status: "pending" });
    }

    if (result.status === "error") {
      return NextResponse.json({ status: "error", error: result.error });
    }

    const tokens = result.tokens!;
    const userInfo = await getUserInfo(tokens.accessToken, tokens.id);

    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    const [existingConnection] = await db
      .select()
      .from(orgConnections)
      .where(
        and(
          eq(orgConnections.orgId, userInfo.orgId),
          eq(orgConnections.sfUserId, userInfo.userId)
        )
      )
      .limit(1);

    let appUserId: string;
    let orgConnectionId: string;

    if (existingConnection) {
      appUserId = existingConnection.appUserId;
      orgConnectionId = existingConnection.id;
      await db
        .update(orgConnections)
        .set({
          refreshToken: encryptedRefreshToken,
          lastUsedAt: new Date(),
          displayName: userInfo.displayName,
          instanceUrl: tokens.instanceUrl,
          username: userInfo.username,
          isActive: true,
        })
        .where(eq(orgConnections.id, orgConnectionId));
      await db
        .update(appUsers)
        .set({ lastSeenAt: new Date() })
        .where(eq(appUsers.id, appUserId));
    } else {
      const [newUser] = await db.insert(appUsers).values({}).returning({ id: appUsers.id });
      appUserId = newUser!.id;
      const [newConn] = await db
        .insert(orgConnections)
        .values({
          appUserId,
          orgId: userInfo.orgId,
          sfUserId: userInfo.userId,
          username: userInfo.username,
          displayName: userInfo.displayName,
          instanceUrl: tokens.instanceUrl,
          orgType,
          refreshToken: encryptedRefreshToken,
        })
        .returning({ id: orgConnections.id });
      orgConnectionId = newConn!.id;
    }

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.accessToken = tokens.accessToken;
    session.instanceUrl = tokens.instanceUrl;
    session.orgId = userInfo.orgId;
    session.sfUserId = userInfo.userId;
    session.username = userInfo.username;
    session.displayName = userInfo.displayName;
    session.orgType = orgType;
    session.issuedAt = Date.now();
    session.appUserId = appUserId;
    session.orgConnectionId = orgConnectionId;
    await session.save();

    return NextResponse.json({
      status: "success",
      username: userInfo.username,
      displayName: userInfo.displayName,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}
