/**
 * Indexing + retrieval over the org's generated documents (`org_documents`).
 *
 * The docs are already produced by lib/docs but were never searchable. This
 * chunks + embeds them and retrieves the most relevant passages to ground an
 * answer — cosine similarity computed in app (small corpora; no vector DB).
 */

import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { orgDocuments } from "../db/schema";
import { embedBatch, embedText, embeddingModel } from "./embed";
import { loadEmbeddings, replaceEmbeddings } from "./store";

function chunk(text: string, size = 800, overlap = 100): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && (current.length + p.length + 2) > size) {
      chunks.push(current);
      current = current.slice(-overlap) + "\n\n" + p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks.length ? chunks : text.trim() ? [text] : [];
}

export async function indexOrgDocuments(
  orgId: string,
): Promise<{ documents: number; chunks: number }> {
  const docs = (await db
    .select()
    .from(orgDocuments)
    .where(eq(orgDocuments.orgId, orgId))) as {
    id: string;
    title: string;
    content: string;
  }[];

  const model = embeddingModel();
  let totalChunks = 0;
  for (const doc of docs) {
    const parts = chunk(doc.content);
    if (parts.length === 0) continue;
    const vectors = await embedBatch(parts);
    await replaceEmbeddings(
      orgId,
      "org_document",
      doc.id,
      parts.map((content, i) => ({ content: `${doc.title}\n${content}`, embedding: vectors[i]! })),
      model,
    );
    totalChunks += parts.length;
  }
  return { documents: docs.length, chunks: totalChunks };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export interface RetrievedChunk {
  content: string;
  sourceId: string;
  score: number;
}

export async function retrieveContext(
  orgId: string,
  query: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  const stored = await loadEmbeddings(orgId);
  if (stored.length === 0) return [];
  const queryVector = await embedText(query);
  return stored
    .map((s) => ({
      content: s.content,
      sourceId: s.sourceId,
      score: cosineSimilarity(queryVector, s.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
