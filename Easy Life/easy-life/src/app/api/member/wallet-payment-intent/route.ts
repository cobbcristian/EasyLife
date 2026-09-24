import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  markHoaChargePaid,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import {
  resolveOwnedOpenCharge,
  settleChargeIfAuthorized,
  buildChargeMetadata,
} from "@/lib/server/charge-payment";
import { getStripe, isWalletPayConfigured } from "@/lib/server/stripe";

/**
 * Creates a PaymentIntent for Apple Pay / Google Pay (Payment Request API).
 * Amount is always resolved server-side for HOA and charge kinds.
 * Ad-hoc amounts (kind=amount) MUST NOT include a chargeId.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    kind?: "hoa" | "charge" | "amount";
    chargeId?: string;
    amount?: number;
    description?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const kind = body.kind ?? "amount";
  const returnPath = "/member/payments";
  let amountCents = 0;
  let description = body.description ?? "Club payment";
  let chargeId: string | undefined;
  let metadata: Record<string, string> = { userEmail: session.email };

  if (kind === "hoa") {
    if (!session.communityId) {
      return NextResponse.json({ error: "Community required" }, { status: 400 });
    }
    const resolved = await resolveHoaPaymentForMember({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name ?? session.email,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { payment } = resolved;
    amountCents = Math.round(payment.amount * 100);
    description = payment.productName;
    chargeId = payment.chargeId;
    metadata = {
      type: "hoa",
      chargeId: payment.chargeId,
      userEmail: session.email.toLowerCase(),
      amountCents: String(amountCents),
      communityId: payment.communityId,
      unit: payment.unit,
      periodId: payment.periodId,
    };
  } else if (kind === "charge") {
    if (!body.chargeId) {
      return NextResponse.json({ error: "chargeId required for kind=charge" }, { status: 400 });
    }
    const resolved = await resolveOwnedOpenCharge(body.chargeId, session.email);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { charge } = resolved;
    amountCents = charge.amountCents;
    description = charge.description;
    chargeId = charge.id;
    metadata = buildChargeMetadata(charge, session.email);
  } else {
    if (body.chargeId) {
      return NextResponse.json(
        { error: "Use kind=charge to pay a specific charge" },
        { status: 400 },
      );
    }
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amountCents = Math.round(amount * 100);
  }

  const stripe = getStripe();
  if (!stripe || !isWalletPayConfigured()) {
    if (isDemoPaymentAllowed()) {
      if (chargeId) {
        if (kind === "hoa") {
          await markHoaChargePaid(chargeId);
        } else {
          const settleResult = await settleChargeIfAuthorized({
            chargeId,
            payerEmail: session.email,
            paidCents: amountCents,
          });
          if (!settleResult.ok) {
            return NextResponse.json({ error: settleResult.error }, { status: 400 });
          }
        }
      }
      return NextResponse.json({
        ok: true,
        paid: true,
        mode: "demo",
        returnPath: `${returnPath}?payment=success${chargeId ? `&chargeId=${chargeId}` : ""}`,
      });
    }
    return NextResponse.json(
      {
        error:
          "Wallet pay requires STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description,
      receipt_email: session.email,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Could not start wallet payment" }, { status: 502 });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountCents / 100,
      description,
      chargeId,
      returnPath: `${returnPath}?payment=success${chargeId ? `&chargeId=${chargeId}` : ""}`,
    });
  } catch {
    return NextResponse.json({ error: "Could not start wallet payment" }, { status: 502 });
  }
}
