import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { getCached, setCache } from "@/lib/db/cache";
import { runDebtScan } from "@/lib/debt/engine";
import type { DebtScanResult } from "@/lib/debt/types";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const orgId = session.orgId || "unknown";

  const cached = await getCached<DebtScanResult>(orgId, "technicalDebt");
  if (cached) return Response.json({ ...cached, fromCache: true });

  const conn = createConnection(session);
  const result = await runDebtScan(conn, session.orgType);

  await setCache(orgId, "technicalDebt", result);
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
  const result = await runDebtScan(conn, session.orgType);

  await setCache(orgId, "technicalDebt", result);
  return Response.json({ ...result, fromCache: false });
}
