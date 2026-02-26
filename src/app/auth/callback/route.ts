import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/salesforce/auth";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/login?error=No+authorization+code+received", request.url)
    );
  }

  const cookieStore = await cookies();
  const orgType = (cookieStore.get("sf_org_type")?.value || "production") as
    | "production"
    | "sandbox";

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, orgType);

    // Get user info
    const userInfo = await getUserInfo(tokens.accessToken, tokens.id);

    // Create session
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.instanceUrl = tokens.instanceUrl;
    session.orgId = userInfo.orgId;
    session.userId = userInfo.userId;
    session.username = userInfo.username;
    session.displayName = userInfo.displayName;
    session.orgType = orgType;
    session.issuedAt = Date.now();
    await session.save();

    // Clean up org type cookie
    cookieStore.delete("sf_org_type");

    return NextResponse.redirect(new URL("/flows", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
