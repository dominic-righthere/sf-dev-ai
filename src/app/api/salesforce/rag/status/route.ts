import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { isEmbeddingConfigured, embeddingModel } from "@/lib/rag/embed";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  return Response.json({
    configured: isEmbeddingConfigured(),
    model: isEmbeddingConfigured() ? embeddingModel() : null,
  });
}
