import { NextResponse } from "next/server";
import {
  settleChargeIfAuthorized,
  settleHoaChargeIfAuthorized,
  verifyWebhookMetadata,
} from "@/lib/server/charge-payment";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout and wallet PaymentIntent payments.
 *
 * Settlement rules:
 * 1. metadata.chargeId is required
 * 2. If metadata.amountCents is present, captured amount must cover it
 * 3. Settlement validates ownership (when userEmail present) and DB charge amount
 *
 * Legacy sessions (created before amountCents was added) will still settle
 * as long as the captured amount covers the charge's DB amount.
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
    const sessionId = session.id;
    const metadata = session.metadata as Record<string, string> | undefined;
    const amountTotal = session.amount_total ?? 0;

    const verified = verifyWebhookMetadata(metadata, amountTotal);
    if (verified) {
      const settleResult = verified.isHoa
        ? await settleHoaChargeIfAuthorized({
            chargeId: verified.chargeId,
            payerEmail: verified.userEmail,
            paidCents: amountTotal,
          })
        : await settleChargeIfAuthorized({
            chargeId: verified.chargeId,
            payerEmail: verified.userEmail,
            paidCents: amountTotal,
          });

      if (!settleResult.ok) {
        console.error("[stripe-webhook] settlement rejected", {
          eventId: event.id,
          eventType: event.type,
          sessionId,
          chargeId: verified.chargeId,
          reason: settleResult.error,
          amountCaptured: amountTotal,
          userEmail: verified.userEmail ?? "(not provided)",
        });
      }
    } else if (metadata?.chargeId) {
      console.error("[stripe-webhook] metadata verification failed", {
        eventId: event.id,
        eventType: event.type,
        sessionId,
        chargeId: metadata.chargeId,
        reason: "amountCents check failed or missing chargeId",
        amountCaptured: amountTotal,
        metadataAmountCents: metadata.amountCents,
      });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const intentId = intent.id;
    const metadata = intent.metadata as Record<string, string> | undefined;
    const amountReceived = intent.amount_received ?? intent.amount ?? 0;

    const verified = verifyWebhookMetadata(metadata, amountReceived);
    if (verified) {
      const settleResult = verified.isHoa
        ? await settleHoaChargeIfAuthorized({
            chargeId: verified.chargeId,
            payerEmail: verified.userEmail,
            paidCents: amountReceived,
          })
        : await settleChargeIfAuthorized({
            chargeId: verified.chargeId,
            payerEmail: verified.userEmail,
            paidCents: amountReceived,
          });

      if (!settleResult.ok) {
        console.error("[stripe-webhook] settlement rejected", {
          eventId: event.id,
          eventType: event.type,
          intentId,
          chargeId: verified.chargeId,
          reason: settleResult.error,
          amountCaptured: amountReceived,
          userEmail: verified.userEmail ?? "(not provided)",
        });
      }
    } else if (metadata?.chargeId) {
      console.error("[stripe-webhook] metadata verification failed", {
        eventId: event.id,
        eventType: event.type,
        intentId,
        chargeId: metadata.chargeId,
        reason: "amountCents check failed or missing chargeId",
        amountCaptured: amountReceived,
        metadataAmountCents: metadata.amountCents,
      });
    }
  }

  return NextResponse.json({ received: true });
}
