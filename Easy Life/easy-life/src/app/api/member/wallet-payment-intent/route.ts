import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  markHoaChargePaid,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import {
  getOwnedOpenCharge,
  settleChargeIfAuthorized,
} from "@/lib/server/records";
import { getStripe, isWalletPayConfigured } from "@/lib/server/stripe";

/**
 * Creates a PaymentIntent for Apple Pay / Google Pay (Payment Request API).
 * Amount is always resolved server-side for HOA and ledger charges.
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
  let chargeId: string | undefined = body.chargeId;
  const metadata: Record<string, string> = { userEmail: session.email };

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
    metadata.type = "hoa";
    metadata.chargeId = payment.chargeId;
    metadata.communityId = payment.communityId;
    metadata.unit = payment.unit;
    metadata.periodId = payment.periodId;
  } else if (kind === "charge" || (kind === "amount" && body.chargeId)) {
    // Any path that attaches a chargeId must prove ownership and use server amount.
    if (!body.chargeId) {
      return NextResponse.json({ error: "chargeId required" }, { status: 400 });
    }
    const charge = await getOwnedOpenCharge(body.chargeId, session.email);
    if (!charge) {
      return NextResponse.json({ error: "Charge not found" }, { status: 404 });
    }
    amountCents = Math.round(charge.amount * 100);
    description = charge.description;
    chargeId = charge.id;
    metadata.chargeId = charge.id;
  } else {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amountCents = Math.round(amount * 100);
    // Do not attach an unverified chargeId on free-amount wallet pays.
    chargeId = undefined;
  }

  const stripe = getStripe();
  if (!stripe || !isWalletPayConfigured()) {
    if (isDemoPaymentAllowed()) {
      if (kind === "hoa" && chargeId) {
        await markHoaChargePaid(chargeId);
      } else if (chargeId) {
        const settled = await settleChargeIfAuthorized({
          chargeId,
          paidCents: amountCents,
          payerEmail: session.email,
        });
        if (!settled) {
          return NextResponse.json({ error: "Could not settle charge" }, { status: 400 });
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
