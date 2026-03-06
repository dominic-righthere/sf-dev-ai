import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { pollDeviceToken, getUserInfo } from "@/lib/salesforce/auth";
import { sessionOptions, type SessionData } from "@/lib/session";

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

    // Success — create session
    const tokens = result.tokens!;
    const userInfo = await getUserInfo(tokens.accessToken, tokens.id);

    const cookieStore = await cookies();
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
