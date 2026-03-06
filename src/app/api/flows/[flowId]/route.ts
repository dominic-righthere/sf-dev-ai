import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { flowDrafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;

  const [draft] = await db
    .select()
    .from(flowDrafts)
    .where(eq(flowDrafts.id, flowId));

  if (!draft) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;
  const body = await request.json();
  const { apiName, label, description, flowJson } = body;

  const [draft] = await db
    .update(flowDrafts)
    .set({
      ...(apiName !== undefined && { apiName }),
      ...(label !== undefined && { label }),
      ...(description !== undefined && { description }),
      ...(flowJson !== undefined && { flowJson }),
      updatedAt: new Date(),
    })
    .where(eq(flowDrafts.id, flowId))
    .returning();

  if (!draft) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ flowId: string }> }
) {
  const { flowId } = await params;

  const [deleted] = await db
    .delete(flowDrafts)
    .where(eq(flowDrafts.id, flowId))
    .returning({ id: flowDrafts.id });

  if (!deleted) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
