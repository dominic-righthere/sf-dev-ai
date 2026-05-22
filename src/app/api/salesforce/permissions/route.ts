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

  const cached = await getCached<{ permissionSets: unknown[]; profiles: unknown[] }>(orgId, "permissionSets");
  if (cached) return Response.json(cached);

  const conn = createConnection(session);

  const [permSets, profiles] = await Promise.all([
    conn.metadata
      .list([{ type: "PermissionSet" }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : [])),
    conn.metadata
      .list([{ type: "Profile" }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : [])),
  ]);

  const data = {
    permissionSets: permSets.map((p: any) => ({
      fullName: p.fullName,
      type: "PermissionSet",
      lastModifiedDate: p.lastModifiedDate,
      lastModifiedByName: p.lastModifiedByName,
      manageableState: p.manageableState,
    })),
    profiles: profiles.map((p: any) => ({
      fullName: p.fullName,
      type: "Profile",
      lastModifiedDate: p.lastModifiedDate,
      lastModifiedByName: p.lastModifiedByName,
    })),
  };

  await setCache(orgId, "permissionSets", data);
  return Response.json(data);
}
