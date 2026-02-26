import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { describeObject, describeCommonObjects, searchSchema } from "@/lib/salesforce/describe";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.orgId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const objectName = request.nextUrl.searchParams.get("object");
  const search = request.nextUrl.searchParams.get("search");
  const init = request.nextUrl.searchParams.get("init");

  const conn = createConnection(session);

  try {
    if (init === "true") {
      await describeCommonObjects(conn, session.orgId);
      return NextResponse.json({ success: true, message: "Common objects cached" });
    }

    if (search) {
      const results = await searchSchema(session.orgId, search);
      return NextResponse.json({ results });
    }

    if (objectName) {
      const describe = await describeObject(conn, session.orgId, objectName);
      return NextResponse.json({ describe });
    }

    return NextResponse.json(
      { error: "Provide ?object=Name, ?search=query, or ?init=true" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Describe failed" },
      { status: 500 }
    );
  }
}
