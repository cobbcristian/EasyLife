import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markLessonPaidAndConfirm } from "@/lib/server/lessons";
import { listMemberCharges, updateMemberChargeStatus } from "@/lib/server/records";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { chargeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.chargeId) {
    return NextResponse.json({ error: "chargeId required" }, { status: 400 });
  }

  const charges = await listMemberCharges({
    communityId: session.communityId,
    memberEmail: session.email,
  });
  const charge = charges.find((c) => c.id === body.chargeId);
  if (!charge) {
    return NextResponse.json({ error: "Charge not found" }, { status: 404 });
  }

  await updateMemberChargeStatus(body.chargeId, "paid");
  await markLessonPaidAndConfirm(body.chargeId);
  await activateSharedCalendarByCharge(body.chargeId);
  await markEscrowHeldByCharge(body.chargeId);
  return NextResponse.json({ ok: true });
}
