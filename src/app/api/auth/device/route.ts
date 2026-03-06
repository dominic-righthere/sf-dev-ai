import { NextRequest, NextResponse } from "next/server";
import { requestDeviceCode } from "@/lib/salesforce/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const orgType = body.orgType as "production" | "sandbox" | undefined;

  if (!orgType || !["production", "sandbox"].includes(orgType)) {
    return NextResponse.json({ error: "Invalid org type" }, { status: 400 });
  }

  try {
    const deviceCode = await requestDeviceCode(orgType);
    return NextResponse.json(deviceCode);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start device flow" },
      { status: 500 }
    );
  }
}
