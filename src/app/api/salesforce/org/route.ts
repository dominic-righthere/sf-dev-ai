import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getCached, setCache } from "@/lib/db/cache";

const COUNT_OBJECTS = ["Account", "Contact", "Opportunity", "Lead", "Case"];

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  const cached = await getCached<unknown>(orgId, "orgInfo");
  if (cached) return Response.json(cached);

  const conn = createConnection(session);

  const [identity, limits, ...countResults] = await Promise.all([
    conn.identity(),
    conn.limits(),
    ...COUNT_OBJECTS.map((obj) =>
      conn
        .query(`SELECT count() FROM ${obj}`)
        .then((r) => ({ object: obj, count: r.totalSize }))
        .catch(() => ({ object: obj, count: null as number | null }))
    ),
  ]);

  const recordCounts: Record<string, number | null> = {};
  for (const r of countResults as { object: string; count: number | null }[]) {
    recordCounts[r.object] = r.count;
  }

  const data = {
    identity: {
      orgId: identity.organization_id,
      userId: identity.user_id,
      username: identity.username,
      displayName: identity.display_name,
      orgType: session.orgType,
      instanceUrl: session.instanceUrl,
    },
    limits: {
      DailyApiRequests: limits.DailyApiRequests,
      DataStorageMB: limits.DataStorageMB,
      FileStorageMB: limits.FileStorageMB,
      SingleEmail: limits.SingleEmail,
      DailyWorkflowEmails: limits.DailyWorkflowEmails,
    },
    recordCounts,
  };

  await setCache(orgId, "orgInfo", data);
  return Response.json(data);
}
