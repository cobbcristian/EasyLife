import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  OPEN_CHARGE_STATUSES,
  settleMemberCharge,
  settlePayAllCharges,
} from "@/lib/server/charge-settle";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  markHoaChargePaid,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import { prisma } from "@/lib/server/prisma";
import { getStripe, isWalletPayConfigured } from "@/lib/server/stripe";

/**
 * Creates a PaymentIntent for Apple Pay / Google Pay (Payment Request API).
 * Amount is always resolved server-side for HOA, single charges, and pay-all.
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
  let payAllChargeIds: string[] | undefined;
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
    metadata.kind = "hoa";
    metadata.chargeId = payment.chargeId;
    metadata.communityId = payment.communityId;
    metadata.unit = payment.unit;
    metadata.periodId = payment.periodId;
    metadata.amountCents = String(amountCents);
  } else if (kind === "charge") {
    if (!body.chargeId) {
      return NextResponse.json({ error: "chargeId required" }, { status: 400 });
    }
    const charge = await prisma.memberCharge.findFirst({
      where: { id: body.chargeId, memberEmail: session.email.toLowerCase() },
    });
    if (!charge) {
      return NextResponse.json({ error: "Charge not found" }, { status: 404 });
    }
    if (charge.status === "paid" || charge.status === "cancelled") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }
    amountCents = Math.round(charge.amount * 100);
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Invalid charge amount" }, { status: 400 });
    }
    description = charge.description;
    chargeId = charge.id;
    metadata.kind = "charge";
    metadata.chargeId = charge.id;
    metadata.amountCents = String(amountCents);
    if (charge.referenceType === "hoa_assessment") {
      metadata.type = "hoa";
    }
  } else if (kind === "amount") {
    // Pay-all: never trust client amount or attach an untrusted chargeId (#32).
    if (body.chargeId) {
      return NextResponse.json(
        { error: "Use kind=charge to pay a specific balance" },
        { status: 400 },
      );
    }
    const dueWhere: {
      memberEmail: string;
      status: { in: string[] };
      communityId?: string;
    } = {
      memberEmail: session.email.toLowerCase(),
      status: { in: OPEN_CHARGE_STATUSES },
    };
    if (session.communityId) {
      dueWhere.communityId = session.communityId;
    }
    const dueCharges = await prisma.memberCharge.findMany({
      where: dueWhere,
      orderBy: { createdAt: "asc" },
    });
    const openPositive = dueCharges.filter((c) => c.amount > 0);
    if (openPositive.length === 0) {
      return NextResponse.json({ error: "Nothing due" }, { status: 400 });
    }
    amountCents = Math.round(
      openPositive.reduce((sum, c) => sum + c.amount, 0) * 100,
    );
    description = body.description ?? "Club account — QuickPay";
    payAllChargeIds = openPositive.map((c) => c.id);
    metadata.kind = "pay_all";
    metadata.chargeIds = payAllChargeIds.join(",");
    metadata.amountCents = String(amountCents);
  } else {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe || !isWalletPayConfigured()) {
    if (isDemoPaymentAllowed()) {
      if (metadata.kind === "hoa" && chargeId) {
        await markHoaChargePaid(chargeId);
      } else if (metadata.kind === "pay_all") {
        const result = await settlePayAllCharges({
          chargeIds: payAllChargeIds ?? [],
          memberEmail: session.email,
          paidCents: amountCents,
        });
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      } else if (chargeId) {
        await settleMemberCharge(chargeId);
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
      chargeIds: payAllChargeIds,
      returnPath: `${returnPath}?payment=success${chargeId ? `&chargeId=${chargeId}` : ""}`,
    });
  } catch {
    return NextResponse.json({ error: "Could not start wallet payment" }, { status: 502 });
  }
}
