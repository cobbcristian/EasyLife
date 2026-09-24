import { NextResponse } from "next/server";
import {
  settleChargeIfAuthorized,
  verifyWebhookMetadata,
} from "@/lib/server/charge-payment";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout and wallet PaymentIntent payments.
 *
 * Settlement rules:
 * 1. metadata.chargeId, userEmail, and amountCents must all be present
 * 2. Captured amount must cover metadata.amountCents
 * 3. Charge ownership is verified (memberEmail === userEmail)
 * 4. Charge must still be open (status !== "paid")
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
    const metadata = session.metadata as Record<string, string> | undefined;
    const amountTotal = session.amount_total ?? 0;

    const verified = verifyWebhookMetadata(metadata, amountTotal);
    if (verified) {
      if (metadata?.type === "hoa") {
        await markHoaChargePaid(verified.chargeId);
      } else {
        await settleChargeIfAuthorized({
          chargeId: verified.chargeId,
          payerEmail: verified.userEmail,
          paidCents: amountTotal,
        });
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const metadata = intent.metadata as Record<string, string> | undefined;
    const amountReceived = intent.amount_received ?? intent.amount ?? 0;

    const verified = verifyWebhookMetadata(metadata, amountReceived);
    if (verified) {
      if (metadata?.type === "hoa") {
        await markHoaChargePaid(verified.chargeId);
      } else {
        await settleChargeIfAuthorized({
          chargeId: verified.chargeId,
          payerEmail: verified.userEmail,
          paidCents: amountReceived,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
