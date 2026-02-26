import jsforce from "jsforce";
import type Connection from "jsforce/lib/connection";
import type { SessionData } from "@/lib/session";

export function createConnection(session: SessionData): Connection {
  if (!session.accessToken || !session.instanceUrl) {
    throw new Error("No Salesforce session");
  }

  const conn = new jsforce.Connection({
    instanceUrl: session.instanceUrl,
    accessToken: session.accessToken,
    version: "62.0",
  });

  return conn;
}
