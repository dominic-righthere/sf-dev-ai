/**
 * Persistence for the document embeddings. Follows the project convention:
 * `db` is the cross-dialect handle (typed loosely), table types come from
 * `../db/schema`, and the SQLite path stores structurally identical rows.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { documentEmbeddings } from "../db/schema";

export interface Chunk {
  content: string;
  embedding: number[];
}

export interface StoredEmbedding {
  sourceId: string;
  content: string;
  embedding: number[];
}

/** Replace all embeddings for one source (idempotent re-index). */
export async function replaceEmbeddings(
  orgId: string,
  sourceType: string,
  sourceId: string,
  chunks: Chunk[],
  model: string,
): Promise<void> {
  await db
    .delete(documentEmbeddings)
    .where(
      and(
        eq(documentEmbeddings.orgId, orgId),
        eq(documentEmbeddings.sourceType, sourceType),
        eq(documentEmbeddings.sourceId, sourceId),
      ),
    );
  if (chunks.length === 0) return;

  await db.insert(documentEmbeddings).values(
    chunks.map((c, i) => ({
      orgId,
      sourceType,
      sourceId,
      chunkIndex: i,
      content: c.content,
      embedding: JSON.stringify(c.embedding),
      model,
    })),
  );
}

export async function loadEmbeddings(orgId: string): Promise<StoredEmbedding[]> {
  const rows = await db
    .select()
    .from(documentEmbeddings)
    .where(eq(documentEmbeddings.orgId, orgId));
  return (rows as { sourceId: string; content: string; embedding: string }[]).map((r) => ({
    sourceId: r.sourceId,
    content: r.content,
    embedding: JSON.parse(r.embedding) as number[],
  }));
}
