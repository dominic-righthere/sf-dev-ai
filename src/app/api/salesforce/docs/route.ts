import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { db } from "@/lib/db/client";
import { orgDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateDocument } from "@/lib/docs/generator";
import type { DocType } from "@/lib/docs/types";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  const docs = await db
    .select({
      id: orgDocuments.id,
      docType: orgDocuments.docType,
      subject: orgDocuments.subject,
      title: orgDocuments.title,
      version: orgDocuments.version,
      generatedAt: orgDocuments.generatedAt,
      updatedAt: orgDocuments.updatedAt,
    })
    .from(orgDocuments)
    .where(eq(orgDocuments.orgId, orgId))
    .orderBy(orgDocuments.updatedAt);

  return Response.json({ docs });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const docType = body.docType as DocType;
  const subject = body.subject as string | undefined;

  if (!docType) {
    return Response.json({ error: "docType is required" }, { status: 400 });
  }

  const orgId = session.orgId || "unknown";
  const conn = createConnection(session);

  const generated = await generateDocument(conn, session, docType);

  // Upsert — find existing doc of same type + subject for this org
  const existing = await db
    .select({ id: orgDocuments.id, version: orgDocuments.version })
    .from(orgDocuments)
    .where(
      and(
        eq(orgDocuments.orgId, orgId),
        eq(orgDocuments.docType, docType),
        subject ? eq(orgDocuments.subject, subject) : eq(orgDocuments.subject, null as unknown as string)
      )
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const row = existing[0]!;
    await db
      .update(orgDocuments)
      .set({
        title: generated.title,
        content: generated.content,
        version: row.version + 1,
        generatedAt: now,
        updatedAt: now,
      })
      .where(eq(orgDocuments.id, row.id));

    const updated = await db
      .select()
      .from(orgDocuments)
      .where(eq(orgDocuments.id, row.id))
      .limit(1);

    return Response.json(updated[0]);
  } else {
    const inserted = await db
      .insert(orgDocuments)
      .values({
        orgId,
        docType,
        subject: subject ?? null,
        title: generated.title,
        content: generated.content,
        version: 1,
        generatedAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json(inserted[0]);
  }
}
