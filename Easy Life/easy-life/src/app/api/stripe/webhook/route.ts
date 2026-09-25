import { NextResponse } from "next/server";
import {
  parseChargeIdsMetadata,
  settleMemberCharge,
  settlePayAllCharges,
} from "@/lib/server/charge-settle";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const chargeId = session.metadata?.chargeId;
    if (chargeId) {
      if (session.metadata?.type === "hoa") {
        await markHoaChargePaid(chargeId);
      } else {
        await settleMemberCharge(chargeId);
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const meta = intent.metadata ?? {};
    const expectedCents = meta.amountCents ? Number(meta.amountCents) : null;
    if (
      expectedCents != null &&
      Number.isFinite(expectedCents) &&
      intent.amount !== expectedCents
    ) {
      return NextResponse.json({ received: true, settled: false });
    }

    if (meta.kind === "pay_all") {
      const email = meta.userEmail;
      if (!email) {
        return NextResponse.json({ received: true, settled: false });
      }
      await settlePayAllCharges({
        chargeIds: parseChargeIdsMetadata(meta.chargeIds),
        memberEmail: email,
        paidCents: intent.amount,
      });
    } else {
      const chargeId = meta.chargeId;
      if (chargeId) {
        if (meta.type === "hoa") {
          await markHoaChargePaid(chargeId);
        } else {
          await settleMemberCharge(chargeId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
