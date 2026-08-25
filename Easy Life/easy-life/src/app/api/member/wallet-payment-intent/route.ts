import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  hoaWalletIdempotencyKey,
  isMemberChargePayable,
  markHoaChargePaid,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import { prisma } from "@/lib/server/prisma";
import { updateMemberChargeStatus } from "@/lib/server/records";
import { getStripe, isWalletPayConfigured } from "@/lib/server/stripe";

async function markPaid(chargeId?: string) {
  if (!chargeId) return;
  await updateMemberChargeStatus(chargeId, "paid");
}

/**
 * Creates a PaymentIntent for Apple Pay / Google Pay (Payment Request API).
 * Amount is always resolved server-side for HOA; generic charges validated by id.
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
  let stripeIdempotencyKey: string | undefined;

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
    if (!(await isMemberChargePayable(payment.chargeId))) {
      return NextResponse.json(
        { error: "This HOA balance is already paid." },
        { status: 400 },
      );
    }
    amountCents = Math.round(payment.amount * 100);
    description = payment.productName;
    chargeId = payment.chargeId;
    metadata.type = "hoa";
    metadata.chargeId = payment.chargeId;
    metadata.communityId = payment.communityId;
    metadata.unit = payment.unit;
    metadata.periodId = payment.periodId;
    stripeIdempotencyKey = hoaWalletIdempotencyKey(payment.chargeId);
  } else if (kind === "charge" && body.chargeId) {
    const charge = await prisma.memberCharge.findFirst({
      where: { id: body.chargeId, memberEmail: session.email.toLowerCase() },
    });
    if (!charge) {
      return NextResponse.json({ error: "Charge not found" }, { status: 404 });
    }
    if (charge.status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }
    amountCents = Math.round(charge.amount * 100);
    description = charge.description;
    chargeId = charge.id;
    metadata.chargeId = charge.id;
    stripeIdempotencyKey = `charge-wallet-${charge.id}`;
  } else {
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amountCents = Math.round(amount * 100);
    if (chargeId) metadata.chargeId = chargeId;
  }

  const stripe = getStripe();
  if (!stripe || !isWalletPayConfigured()) {
    if (isDemoPaymentAllowed()) {
      if (kind === "hoa" && chargeId) {
        await markHoaChargePaid(chargeId);
      } else {
        await markPaid(chargeId);
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
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        description,
        receipt_email: session.email,
        metadata,
        automatic_payment_methods: { enabled: true },
      },
      stripeIdempotencyKey ? { idempotencyKey: stripeIdempotencyKey } : undefined,
    );

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
