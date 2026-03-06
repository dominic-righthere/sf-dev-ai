import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/salesforce/auth";
import { sessionOptions, type SessionData } from "@/lib/session";

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

  try {
    // Exchange code for tokens — use stored callback URL and PKCE verifier
    const tokens = await exchangeCodeForTokens(code, orgType, storedCallbackUrl, codeVerifier);

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

    // Clean up temporary cookies
    cookieStore.delete("sf_org_type");
    cookieStore.delete("sf_callback_url");
    cookieStore.delete("sf_code_verifier");

    return NextResponse.redirect(`${origin}/flows`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
}
