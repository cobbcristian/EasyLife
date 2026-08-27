import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listPricingRules,
  upsertPricingRule,
  calculateDynamicPrice,
} from "@/lib/server/tee-pricing";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const baseFee = parseFloat(searchParams.get("baseFee") ?? "0");
  const date = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const amenityId = searchParams.get("amenityId") ?? undefined;

  if (date && startTime && baseFee > 0) {
    const pricing = await calculateDynamicPrice({
      communityId,
      amenityId,
      baseFee,
      date,
      startTime,
    });
    return NextResponse.json({ pricing });
  }

  const rules = await listPricingRules(communityId);
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: {
    id?: string;
    amenityId?: string;
    name: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    multiplier?: number;
    flatAdjustment?: number;
    active?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const rule = await upsertPricingRule({
      ...body,
      communityId,
      dayOfWeek: body.dayOfWeek ?? "*",
      startTime: body.startTime ?? "06:00",
      endTime: body.endTime ?? "18:00",
      multiplier: body.multiplier ?? 1,
      flatAdjustment: body.flatAdjustment ?? 0,
    });
    return NextResponse.json({ rule });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 404 },
    );
  }
}
