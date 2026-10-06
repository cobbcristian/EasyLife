import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { listMemberCharges, updateMemberChargeStatus } from "@/lib/server/records";
import { getStripe } from "@/lib/server/stripe";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { chargeId?: string; paymentIntentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.chargeId) {
    return NextResponse.json({ error: "chargeId required" }, { status: 400 });
  }

  if (body.paymentIntentId) {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }
    const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
    const paid =
      intent.status === "succeeded" &&
      intent.metadata?.chargeId === body.chargeId &&
      (intent.metadata?.userEmail ?? "").toLowerCase() === session.email.toLowerCase();
    if (!paid) {
      return NextResponse.json({ error: "Payment has not been confirmed" }, { status: 402 });
    }
  } else if (!isDemoPaymentAllowed()) {
    return NextResponse.json({ error: "Payment has not been confirmed" }, { status: 403 });
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
  await activateSharedCalendarByCharge(body.chargeId);
  await markEscrowHeldByCharge(body.chargeId);
  return NextResponse.json({ ok: true });
}
