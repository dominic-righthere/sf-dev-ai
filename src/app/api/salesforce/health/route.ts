import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getCached, setCache } from "@/lib/db/cache";
import { runHealthScan } from "@/lib/health/engine";
import type { HealthScanResult } from "@/lib/health/types";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  const cached = await getCached<HealthScanResult>(orgId, "healthScan");
  if (cached) {
    return Response.json({ ...cached, fromCache: true });
  }

  const conn = createConnection(session);
  const result = await runHealthScan(conn, session.orgType);

  await setCache(orgId, "healthScan", result);
  return Response.json({ ...result, fromCache: false });
}

export async function POST() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";
  const conn = createConnection(session);
  const result = await runHealthScan(conn, session.orgType);

  await setCache(orgId, "healthScan", result);
  return Response.json({ ...result, fromCache: false });
}
