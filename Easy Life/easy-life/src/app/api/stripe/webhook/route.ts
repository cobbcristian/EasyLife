import { NextResponse } from "next/server";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import { applyFundraisingDonationPaid } from "@/lib/server/fundraising";
import { updateMemberChargeStatus } from "@/lib/server/records";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout and wallet PaymentIntent payments; marks linked charges paid.
 * Requires STRIPE_WEBHOOK_SECRET. Amount was set server-side at session create;
 * residents cannot alter it on the Stripe hosted page.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  async function settleCharge(chargeId: string, type?: string) {
    if (type === "hoa") {
      await markHoaChargePaid(chargeId);
      return;
    }
    await updateMemberChargeStatus(chargeId, "paid");
    await activateSharedCalendarByCharge(chargeId);
    await markEscrowHeldByCharge(chargeId);
    await applyFundraisingDonationPaid(chargeId);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const chargeId = session.metadata?.chargeId;
    if (chargeId) {
      await settleCharge(chargeId, session.metadata?.type);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const chargeId = intent.metadata?.chargeId;
    if (chargeId) {
      await settleCharge(chargeId, intent.metadata?.type);
    }
  }

  return NextResponse.json({ received: true });
}
