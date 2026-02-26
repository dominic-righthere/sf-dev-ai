import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl } from "@/lib/salesforce/auth";
import { cookies } from "next/headers";

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

  // Store org type in a cookie for the callback
  const cookieStore = await cookies();
  cookieStore.set("sf_org_type", orgType, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
  });

  const authUrl = buildAuthorizationUrl(orgType);
  return NextResponse.redirect(authUrl);
}
