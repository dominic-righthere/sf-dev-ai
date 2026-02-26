import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/session";
import { createConnection } from "@/lib/salesforce/connection";
import { deployFlowViaCrud } from "@/lib/salesforce/metadata";
import { deserializeFlowDefinition } from "@/lib/flow/types";
import { flowToMetadataXml } from "@/lib/flow/converter";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { flowJson } = body;

    if (!flowJson) {
      return NextResponse.json(
        { error: "Flow JSON is required" },
        { status: 400 }
      );
    }

    const flow = deserializeFlowDefinition(flowJson);
    const conn = createConnection(session);

    // Build metadata object for CRUD deploy
    const metadata: Record<string, unknown> = {
      fullName: flow.apiName,
      label: flow.label,
      description: flow.description,
      processType: flow.processType,
      status: "Draft",
      // Additional metadata would be built here
    };

    const result = await deployFlowViaCrud(conn, metadata);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        errors: [err instanceof Error ? err.message : "Deploy failed"],
      },
      { status: 500 }
    );
  }
}
