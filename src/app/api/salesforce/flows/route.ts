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

  const cached = await getCached<{ flows: unknown[] }>(orgId, "flows");
  if (cached) return Response.json(cached);

  const conn = createConnection(session);

  // Get flow metadata list
  const metaResult = await conn.metadata.list([{ type: "Flow" }]);
  const metaItems = Array.isArray(metaResult) ? metaResult : metaResult ? [metaResult] : [];

  // Get FlowDefinition details via SOQL for process type and active version
  let flowDefs: Record<string, { processType?: string; description?: string; activeVersionNumber?: number }> = {};
  try {
    const soql = "SELECT DeveloperName, Description, ProcessType, ActiveVersion.VersionNumber FROM FlowDefinition";
    const result = await conn.query<{
      DeveloperName: string;
      Description?: string;
      ProcessType?: string;
      ActiveVersion?: { VersionNumber?: number };
    }>(soql);
    for (const r of result.records) {
      flowDefs[r.DeveloperName] = {
        processType: r.ProcessType,
        description: r.Description,
        activeVersionNumber: r.ActiveVersion?.VersionNumber,
      };
    }
  } catch {
    // FlowDefinition may not be queryable in all orgs
  }

  const flows = metaItems.map((f: any) => {
    const devName = f.fullName;
    const def = flowDefs[devName];
    return {
      fullName: devName,
      lastModifiedDate: f.lastModifiedDate,
      lastModifiedByName: f.lastModifiedByName,
      processType: def?.processType || null,
      description: def?.description || null,
      isActive: def?.activeVersionNumber != null,
    };
  });

  const data = { flows };
  await setCache(orgId, "flows", data);
  return Response.json(data);
}
