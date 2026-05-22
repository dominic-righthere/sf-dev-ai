import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, resolveCallbackUrl, generateCodeVerifier, generateCodeChallenge } from "@/lib/salesforce/auth";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function GET(request: NextRequest) {
  const orgType = request.nextUrl.searchParams.get("orgType") as
    | "production"
    | "sandbox"
    | null;

  if (!orgType || !["production", "sandbox"].includes(orgType)) {
    return NextResponse.json(
      { error: "Invalid org type" },
      { status: 400 }
    );
  }

  try {
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const externalOrigin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(request.url).origin;
    const externalUrl = `${externalOrigin}${new URL(request.url).pathname}`;

    const callbackUrl = resolveCallbackUrl(externalUrl);
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const cookieStore = await cookies();

    // If user already has a session, carry their appUserId through the OAuth round-trip
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (session.appUserId) {
      cookieStore.set("sf_app_user_id", session.appUserId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 300,
      });
    }

    cookieStore.set("sf_org_type", orgType, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300,
    });
    cookieStore.set("sf_callback_url", callbackUrl, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300,
    });
    cookieStore.set("sf_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300,
    });

    const authUrl = buildAuthorizationUrl(orgType, externalUrl, codeChallenge);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth initialization failed";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const origin = host ? `${proto}://${host}` : new URL(request.url).origin;
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    );
  }
}
