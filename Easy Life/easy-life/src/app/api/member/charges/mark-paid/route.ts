import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { canSettleChargeFromClientRedirect } from "@/lib/server/charge-payment";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { listMemberCharges, updateMemberChargeStatus } from "@/lib/server/records";
import { getStripe } from "@/lib/server/stripe";

/**
 * Success-page callback after Checkout return.
 * Client redirects are NOT proof of payment when Stripe is configured —
 * the webhook settles those charges. Demo mode (no Stripe) may settle here.
 */
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

  if (charge.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  if (
    !canSettleChargeFromClientRedirect({
      stripeConfigured: Boolean(getStripe()),
      demoPaymentsAllowed: isDemoPaymentAllowed(),
    })
  ) {
    // Stripe webhook (or stored-card path) is the source of truth.
    return NextResponse.json({ ok: true, pendingWebhook: true });
  }

  await updateMemberChargeStatus(body.chargeId, "paid");
  await activateSharedCalendarByCharge(body.chargeId);
  await markEscrowHeldByCharge(body.chargeId);
  return NextResponse.json({ ok: true });
}
