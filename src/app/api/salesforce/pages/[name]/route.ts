import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken || !session.instanceUrl) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name } = await params;
  const conn = createConnection(session);

  const result = await conn.metadata.read("FlexiPage", name);

  return Response.json(result);
}
