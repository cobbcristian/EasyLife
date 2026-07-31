import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, getRewardAccount, redeemReward } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const account = await getRewardAccount(session.email);
  return NextResponse.json({
    points: account.points,
    tier: account.tier,
    nextTier: account.nextTier,
    toNext: account.toNext,
    perks: account.perks,
    history: account.history.map((h) => ({
      id: h.id,
      label: h.label,
      points: h.points,
      date: h.createdAt.toISOString().slice(0, 10),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { perkId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.perkId) return NextResponse.json({ error: "Perk required" }, { status: 400 });
  const result = await redeemReward(session.email, body.perkId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, points: result.points });
}
