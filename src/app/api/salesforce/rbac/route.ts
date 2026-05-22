import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getPermissionSetGroups, getUnassignedPermissionSets } from "@/lib/salesforce/rbac";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const conn = createConnection(session);
    const [groups, unassigned] = await Promise.all([
      getPermissionSetGroups(conn),
      getUnassignedPermissionSets(conn),
    ]);

    return Response.json({ groups, unassigned });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "RBAC query failed" },
      { status: 500 }
    );
  }
}
