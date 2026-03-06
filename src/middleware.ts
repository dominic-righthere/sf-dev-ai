import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect Salesforce API routes — everything else is open
  if (pathname.startsWith("/api/salesforce")) {
    const sessionCookie = request.cookies.get("sf-dev-ai-session");
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated. Connect a Salesforce org first." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/salesforce/:path*"],
};
