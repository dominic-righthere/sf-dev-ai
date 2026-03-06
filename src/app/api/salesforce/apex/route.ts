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

  const classResult = await conn.tooling.query(
    "SELECT Id, Name, Status, LengthWithoutComments, ApiVersion, LastModifiedDate FROM ApexClass ORDER BY Name"
  );
  const triggerResult = await conn.tooling.query(
    "SELECT Id, Name, TableEnumOrId, Status, ApiVersion, LastModifiedDate FROM ApexTrigger ORDER BY Name"
  );
  const classes = (classResult as any).records as any[];
  const triggers = (triggerResult as any).records as any[];

  return Response.json({
    classes: classes.map((c) => ({
      id: c.Id,
      name: c.Name,
      status: c.Status,
      length: c.LengthWithoutComments,
      apiVersion: c.ApiVersion,
      lastModified: c.LastModifiedDate,
    })),
    triggers: triggers.map((t) => ({
      id: t.Id,
      name: t.Name,
      object: t.TableEnumOrId,
      status: t.Status,
      apiVersion: t.ApiVersion,
      lastModified: t.LastModifiedDate,
    })),
  });
}
