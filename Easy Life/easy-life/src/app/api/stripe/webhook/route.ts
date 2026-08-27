import { NextResponse } from "next/server";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import { settleChargeIfAuthorized } from "@/lib/server/records";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout and wallet PaymentIntent payments; marks linked charges paid.
 * Requires STRIPE_WEBHOOK_SECRET. Settles only when paid cents cover the charge and
 * metadata.userEmail matches the charge owner (when present).
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const chargeId = session.metadata?.chargeId;
    if (chargeId) {
      if (session.metadata?.type === "hoa") {
        await markHoaChargePaid(chargeId);
      } else {
        const paidCents =
          typeof session.amount_total === "number" ? session.amount_total : 0;
        const settled = await settleChargeIfAuthorized({
          chargeId,
          paidCents,
          payerEmail: session.metadata?.userEmail,
        });
        if (settled) {
          await activateSharedCalendarByCharge(chargeId);
          await markEscrowHeldByCharge(chargeId);
        }
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const chargeId = intent.metadata?.chargeId;
    if (chargeId) {
      if (intent.metadata?.type === "hoa") {
        await markHoaChargePaid(chargeId);
      } else {
        const paidCents = typeof intent.amount === "number" ? intent.amount : 0;
        const settled = await settleChargeIfAuthorized({
          chargeId,
          paidCents,
          payerEmail: intent.metadata?.userEmail,
        });
        if (settled) {
          await activateSharedCalendarByCharge(chargeId);
          await markEscrowHeldByCharge(chargeId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
