import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/lib/db/client";
import { flowDrafts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.orgId) {
    // Return empty list for unauthenticated users — flows can exist without an org
    return NextResponse.json({ drafts: [] });
  }

  const drafts = await db
    .select({
      id: flowDrafts.id,
      apiName: flowDrafts.apiName,
      label: flowDrafts.label,
      description: flowDrafts.description,
      status: flowDrafts.status,
      createdAt: flowDrafts.createdAt,
      updatedAt: flowDrafts.updatedAt,
    })
    .from(flowDrafts)
    .where(eq(flowDrafts.orgId, session.orgId))
    .orderBy(desc(flowDrafts.updatedAt));

  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const orgId = session.orgId || "local";

  const body = await request.json();
  const { apiName, label, description, flowJson } = body;

  if (!apiName || !label || !flowJson) {
    return NextResponse.json(
      { error: "Missing required fields: apiName, label, flowJson" },
      { status: 400 }
    );
  }

  const [draft] = await db
    .insert(flowDrafts)
    .values({
      orgId,
      apiName,
      label,
      description: description || "",
      flowJson,
      conversationId: body.conversationId || null,
    })
    .returning();

  return NextResponse.json({ draft }, { status: 201 });
}
