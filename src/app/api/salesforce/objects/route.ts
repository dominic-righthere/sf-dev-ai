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

  const cached = await getCached<{ objects: unknown[] }>(orgId, "objectList");
  if (cached) return Response.json(cached);

  const conn = createConnection(session);
  const result = await conn.describeGlobal();

  const objects = result.sobjects
    .filter((o) => o.queryable)
    .map((o) => ({
      name: o.name,
      label: o.label,
      labelPlural: o.labelPlural,
      custom: o.custom,
      keyPrefix: o.keyPrefix,
      queryable: o.queryable,
      createable: o.createable,
      updateable: o.updateable,
      deletable: o.deletable,
    }));

  const data = { objects };
  await setCache(orgId, "objectList", data);
  return Response.json(data);
}
