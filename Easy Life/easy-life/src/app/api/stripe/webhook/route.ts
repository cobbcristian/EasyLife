import { NextResponse } from "next/server";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import {
  EVENT_FEE_REFERENCE,
  markEventFeePaidAndRsvp,
} from "@/lib/server/event-rsvp-payment";
import { markClinicGuestPaidAndRsvp } from "@/lib/server/clinics";
import { updateMemberChargeStatus } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook — confirms Checkout payment and marks the linked charge paid.
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
        const charge = await prisma.memberCharge.findUnique({
          where: { id: chargeId },
        });
        if (charge?.referenceType === EVENT_FEE_REFERENCE) {
          await markEventFeePaidAndRsvp(chargeId);
        } else if (charge?.referenceType === "clinic_guest_fee") {
          await markClinicGuestPaidAndRsvp(chargeId);
        } else {
          await updateMemberChargeStatus(chargeId, "paid");
        }
        await activateSharedCalendarByCharge(chargeId);
        await markEscrowHeldByCharge(chargeId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
