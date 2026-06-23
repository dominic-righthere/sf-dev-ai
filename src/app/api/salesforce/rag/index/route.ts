import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { isEmbeddingConfigured } from "@/lib/rag/embed";
import { indexOrgDocuments } from "@/lib/rag/pipeline";

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isEmbeddingConfigured()) {
    return Response.json(
      {
        error:
          "Embedding API not configured. Set EMBEDDING_API_KEY (and optionally EMBEDDING_BASE_URL / EMBEDDING_MODEL) and restart.",
      },
      { status: 400 },
    );
  }

  const orgId = session.orgId || "unknown";

  try {
    const stats = await indexOrgDocuments(orgId);
    return Response.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
