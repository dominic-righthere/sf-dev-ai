import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getCached, setCache } from "@/lib/db/cache";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  const cached = await getCached<{ pages: unknown[] }>(orgId, "flexiPages");
  if (cached) return Response.json(cached);

  const conn = createConnection(session);

  const result = await conn.metadata.list([{ type: "FlexiPage" }]);
  const items = Array.isArray(result) ? result : result ? [result] : [];

  const data = {
    pages: items.map((p: any) => ({
      fullName: p.fullName,
      lastModifiedDate: p.lastModifiedDate,
      lastModifiedByName: p.lastModifiedByName,
      createdDate: p.createdDate,
      createdByName: p.createdByName,
    })),
  };

  await setCache(orgId, "flexiPages", data);
  return Response.json(data);
}
