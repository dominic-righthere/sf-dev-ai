import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const conn = createConnection(session);

  const [permSets, profiles] = await Promise.all([
    conn.metadata
      .list([{ type: "PermissionSet" }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : [])),
    conn.metadata
      .list([{ type: "Profile" }])
      .then((r) => (Array.isArray(r) ? r : r ? [r] : [])),
  ]);

  return Response.json({
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
  });
}
