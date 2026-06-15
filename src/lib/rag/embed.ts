/**
 * Embedding client. Calls an OpenAI-compatible `/embeddings` endpoint via fetch
 * — no SDK dependency, and it works with OpenAI, Voyage, or a gateway by setting
 * EMBEDDING_BASE_URL. Keeps the product lean (no native ONNX runtime).
 *
 * Env: EMBEDDING_API_KEY (required), EMBEDDING_BASE_URL (default OpenAI),
 *      EMBEDDING_MODEL (default text-embedding-3-small).
 */

const BASE_URL = process.env.EMBEDDING_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

export function embeddingModel(): string {
  return MODEL;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.EMBEDDING_API_KEY);
}

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) throw new Error("EMBEDDING_API_KEY is not set. See .env.example.");
  if (texts.length === 0) return [];

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`Embedding API returned ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as EmbeddingResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector!;
}
