import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getUserAssignments } from "@/lib/salesforce/rbac";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const conn = createConnection(session);
    const users = await getUserAssignments(conn);

    const userId = request.nextUrl.searchParams.get("userId");
    if (userId) {
      const user = users.find((u) => u.userId === userId);
      return Response.json({ user: user || null });
    }

    return Response.json({ users });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "User query failed" },
      { status: 500 }
    );
  }
}
