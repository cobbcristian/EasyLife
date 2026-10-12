import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { createBid, ensureRecordsSeeded, listBids, logEvent } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || !["board", "admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const bids = await listBids(session.communityId);
  return NextResponse.json({ bids });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["board", "admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { project?: string; vendor?: string; amount?: number; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.project || !body.vendor || body.amount == null) {
    return NextResponse.json({ error: "Project, vendor, and amount required" }, { status: 400 });
  }

  const bid = await createBid({
    communityId: session.communityId,
    project: body.project,
    vendor: body.vendor,
    amount: Number(body.amount),
    status: body.status,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Bid submitted",
    detail: body.project,
  });
  return NextResponse.json({ ok: true, bid });
}
