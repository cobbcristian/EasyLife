import { NextResponse } from "next/server";
import {
  getChargeByPayToken,
  updateMemberChargeStatus,
} from "@/lib/server/records";
import { markClinicGuestPaidAndRsvp } from "@/lib/server/clinics";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import { getStripe } from "@/lib/server/stripe";

type Params = { params: Promise<{ token: string }> };

const GUEST_REF_TYPES = new Set(["court_guest_fee", "clinic_guest_fee"]);

/** Public: load a guest fee invoice by pay token (no login). */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const charge = await getChargeByPayToken(token);
  if (!charge || !charge.referenceType || !GUEST_REF_TYPES.has(charge.referenceType)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({
    charge: {
      id: charge.id,
      guestName: charge.memberName,
      guestEmail: charge.memberEmail,
      description: charge.description,
      amount: charge.amount,
      status: charge.status,
      dueDate: charge.dueDate,
      kind: charge.referenceType,
    },
  });
}

/** Public: pay guest fee (demo mark-paid or Stripe Checkout). */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const charge = await getChargeByPayToken(token);
  if (!charge || !charge.referenceType || !GUEST_REF_TYPES.has(charge.referenceType)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (charge.status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const stripe = getStripe();
  const isClinic = charge.referenceType === "clinic_guest_fee";

  if (!stripe) {
    if (!isDemoPaymentAllowed()) {
      return NextResponse.json(
        { error: "Payments are not configured." },
        { status: 503 },
      );
    }
    if (isClinic) {
      await markClinicGuestPaidAndRsvp(charge.id);
    } else {
      await updateMemberChargeStatus(charge.id, "paid");
    }
    return NextResponse.json({
      ok: true,
      paid: true,
      mode: "demo",
      returnPath: `/pay/guest/${token}?payment=success`,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(charge.amount * 100),
          product_data: {
            name: charge.description.slice(0, 120),
            description: isClinic
              ? `Clinic guest fee — ${charge.memberName}`
              : `Court guest fee — ${charge.memberName}`,
          },
        },
      },
    ],
    customer_email: charge.memberEmail ?? undefined,
    metadata: {
      chargeId: charge.id,
      payToken: token,
      kind: charge.referenceType,
      amountCents: String(Math.round(charge.amount * 100)),
    },
    success_url: `${origin}/pay/guest/${token}?payment=success`,
    cancel_url: `${origin}/pay/guest/${token}?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url, mode: "stripe" });
}
