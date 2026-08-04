import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  markHoaChargePaid,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import { getStripe } from "@/lib/server/stripe";

/**
 * Creates a Stripe Checkout Session for the resident's unit HOA amount.
 * Amount is always computed server-side from UnitHoaFee / open hoa charge —
 * never accepted from the client body.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const resolved = await resolveHoaPaymentForMember({
    communityId: session.communityId,
    memberEmail: session.email,
    memberName: session.name ?? session.email,
  });

  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const { payment } = resolved;
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const returnPath = "/member/payments";

  const stripe = getStripe();
  if (!stripe) {
    if (isDemoPaymentAllowed()) {
      await markHoaChargePaid(payment.chargeId);
      return NextResponse.json({
        ok: true,
        paid: true,
        mode: "demo",
        unit: payment.unit,
        amount: payment.amount,
        returnPath: `${returnPath}?payment=success&chargeId=${payment.chargeId}`,
      });
    }
    return NextResponse.json(
      {
        error:
          "Payments are not configured. Add STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for production webhooks).",
      },
      { status: 503 },
    );
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: payment.productName,
              description: `${payment.productDescription} · Unit ${payment.unit}`,
            },
            unit_amount: Math.round(payment.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?payment=success&chargeId=${payment.chargeId}`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
      metadata: {
        type: "hoa",
        chargeId: payment.chargeId,
        userEmail: session.email,
        communityId: payment.communityId,
        unit: payment.unit,
        periodId: payment.periodId,
        amountCents: String(Math.round(payment.amount * 100)),
      },
    });

    return NextResponse.json({
      url: checkout.url,
      mode: "checkout",
      unit: payment.unit,
      amount: payment.amount,
      chargeId: payment.chargeId,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not start HOA checkout" },
      { status: 502 },
    );
  }
}
