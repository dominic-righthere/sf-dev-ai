import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getObjectAccessAudit, getFieldAccessAudit } from "@/lib/salesforce/rbac";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const objectName = request.nextUrl.searchParams.get("object");
  const fieldName = request.nextUrl.searchParams.get("field");

  if (!objectName) {
    return Response.json({ error: "object parameter required" }, { status: 400 });
  }

  try {
    const conn = createConnection(session);

    if (fieldName) {
      const entries = await getFieldAccessAudit(conn, objectName, fieldName);
      return Response.json({ type: "field", object: objectName, field: fieldName, entries });
    }

    const entries = await getObjectAccessAudit(conn, objectName);
    return Response.json({ type: "object", object: objectName, entries });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Audit query failed" },
      { status: 500 }
    );
  }
}
