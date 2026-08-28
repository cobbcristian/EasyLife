import { NextResponse } from "next/server";
import {
  checkoutSessionIsPaid,
  settleMemberChargePaid,
} from "@/lib/server/settle-charge";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout and wallet PaymentIntent payments; marks linked charges paid.
 * Requires STRIPE_WEBHOOK_SECRET. Amount was set server-side at session create;
 * residents cannot alter it on the Stripe hosted page.
 *
 * Checkout with async methods (ACH/bank) can emit checkout.session.completed while
 * payment_status is still "unpaid". Only settle when funds are paid, and also handle
 * checkout.session.async_payment_succeeded.
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

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const chargeId = session.metadata?.chargeId;
    if (
      chargeId &&
      (event.type === "checkout.session.async_payment_succeeded" ||
        checkoutSessionIsPaid(session.payment_status))
    ) {
      await settleMemberChargePaid(chargeId);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const chargeId = intent.metadata?.chargeId;
    if (chargeId) {
      await settleMemberChargePaid(chargeId);
    }
  }

  return NextResponse.json({ received: true });
}
