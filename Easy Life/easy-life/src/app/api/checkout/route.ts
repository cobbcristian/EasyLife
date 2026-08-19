import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markLessonPaidAndConfirm } from "@/lib/server/lessons";
import {
  chargeStoredPaymentMethod,
  getPaymentSettings,
} from "@/lib/server/payment-methods";
import { updateMemberChargeStatus } from "@/lib/server/records";
import { getStripe } from "@/lib/server/stripe";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";

async function afterChargePaid(chargeId: string | undefined) {
  if (!chargeId) return;
  await updateMemberChargeStatus(chargeId, "paid");
  await markLessonPaidAndConfirm(chargeId);
  await activateSharedCalendarByCharge(chargeId);
  await markEscrowHeldByCharge(chargeId);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    amount?: number;
    description?: string;
    returnPath?: string;
    chargeId?: string;
    paymentMethodId?: string;
    forceCheckout?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const returnPath = body.returnPath ?? "/member/payments";
  const description = body.description ?? "Club payment";

  const settings = await getPaymentSettings(session.email);
  const useStored =
    !body.forceCheckout &&
    settings.preference === "store" &&
    settings.methods.length > 0;

  if (useStored) {
    const defaultMethod = body.paymentMethodId
      ? settings.methods.find((m) => m.id === body.paymentMethodId)
      : settings.methods.find((m) => m.isDefault);

    if (!defaultMethod) {
      return NextResponse.json(
        { error: "Add a payment method and choose a default in Payment settings." },
        { status: 400 },
      );
    }

    try {
      const result = await chargeStoredPaymentMethod({
        userEmail: session.email,
        amount,
        description,
        paymentMethodId: defaultMethod.id,
      });

      if (result.status === "action_required" && result.url) {
        return NextResponse.json({ url: result.url, mode: "stored" });
      }

      if (body.chargeId) {
        await afterChargePaid(body.chargeId);
      }

      return NextResponse.json({
        ok: true,
        paid: true,
        mode: "stored",
        method: defaultMethod,
        returnPath: `${returnPath}?payment=success`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Payment failed";
      return NextResponse.json({ error: message }, { status: 402 });
    }
  }

  const stripe = getStripe();
  if (!stripe) {
    if (isDemoPaymentAllowed()) {
      if (body.chargeId) {
        await afterChargePaid(body.chargeId);
      }
      return NextResponse.json({
        ok: true,
        paid: true,
        mode: "demo",
        returnPath: `${returnPath}?payment=success`,
      });
    }
    return NextResponse.json(
      {
        error:
          "Payments are not configured. Add STRIPE_SECRET_KEY to enable checkout, or set ALLOW_DEMO_PAYMENTS=1 for sandbox charges.",
      },
      { status: 503 },
    );
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?payment=success${body.chargeId ? `&chargeId=${body.chargeId}` : ""}`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
      metadata: body.chargeId ? { chargeId: body.chargeId, userEmail: session.email } : undefined,
    });
    return NextResponse.json({ url: checkout.url, mode: "checkout" });
  } catch {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
