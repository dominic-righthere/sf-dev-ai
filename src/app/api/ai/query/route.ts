import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getAnthropicClient, MODEL } from "@/lib/ai/client";
import { SOQL_SYSTEM_PROMPT } from "@/lib/ai/prompts/soql-system";
import { assembleFlowContext } from "@/lib/ai/context";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const client = getAnthropicClient();
    const context = assembleFlowContext(session.orgId || "");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `${SOQL_SYSTEM_PROMPT}\n\n${context}`,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    // Try to parse as JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch {
      // Not JSON, return as text
    }

    return NextResponse.json({ query: text, explanation: "", tips: [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query generation failed" },
      { status: 500 }
    );
  }
}
