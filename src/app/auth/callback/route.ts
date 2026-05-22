import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/salesforce/auth";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { appUsers, orgConnections } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { and, eq } from "drizzle-orm";

function getExternalOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const origin = getExternalOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=No+authorization+code+received`
    );
  }

  const cookieStore = await cookies();
  const orgType = (cookieStore.get("sf_org_type")?.value || "production") as
    | "production"
    | "sandbox";
  const storedCallbackUrl = cookieStore.get("sf_callback_url")?.value;
  const codeVerifier = cookieStore.get("sf_code_verifier")?.value;
  const existingAppUserId = cookieStore.get("sf_app_user_id")?.value;

  try {
    const tokens = await exchangeCodeForTokens(code, orgType, storedCallbackUrl, codeVerifier);
    const userInfo = await getUserInfo(tokens.accessToken, tokens.id);

    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Look up existing connection for this (orgId, sfUserId) pair
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
      // Update existing connection
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

      // Update app user last seen
      await db
        .update(appUsers)
        .set({ lastSeenAt: new Date() })
        .where(eq(appUsers.id, appUserId));
    } else {
      // Determine which app_users row to use
      if (existingAppUserId) {
        appUserId = existingAppUserId;
      } else {
        const [newUser] = await db.insert(appUsers).values({}).returning({ id: appUsers.id });
        appUserId = newUser!.id;
      }

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

    // Write session — no refreshToken in session
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

    // Clean up temporary cookies
    cookieStore.delete("sf_org_type");
    cookieStore.delete("sf_callback_url");
    cookieStore.delete("sf_code_verifier");
    cookieStore.delete("sf_app_user_id");

    return NextResponse.redirect(`${origin}/flows`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
}
