import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "SOQL query is required" },
        { status: 400 }
      );
    }

    // Basic SOQL injection prevention — only allow SELECT queries
    const trimmed = query.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT")) {
      return NextResponse.json(
        { error: "Only SELECT queries are allowed" },
        { status: 400 }
      );
    }

    const conn = createConnection(session);
    const result = await conn.query(query);

    return NextResponse.json({
      totalSize: result.totalSize,
      done: result.done,
      records: result.records,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
