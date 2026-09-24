import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  chargeStoredPaymentMethod,
  getPaymentSettings,
} from "@/lib/server/payment-methods";
import {
  resolveOwnedOpenCharge,
  settleChargeIfAuthorized,
  buildChargeMetadata,
} from "@/lib/server/charge-payment";
import { getStripe } from "@/lib/server/stripe";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import { stripeCheckoutPaymentOptions } from "@/lib/server/stripe-checkout-options";

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

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const returnPath = body.returnPath ?? "/member/payments";

  let amount: number;
  let amountCents: number;
  let description: string;
  let chargeId: string | undefined;
  let metadata: Record<string, string> | undefined;

  if (body.chargeId) {
    const resolved = await resolveOwnedOpenCharge(body.chargeId, session.email);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { charge } = resolved;
    amount = charge.amount;
    amountCents = charge.amountCents;
    description = charge.description;
    chargeId = charge.id;
    metadata = buildChargeMetadata(charge, session.email);
  } else {
    amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amountCents = Math.round(amount * 100);
    description = body.description ?? "Club payment";
  }

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
        metadata,
      });

      if (result.status === "action_required" && result.url) {
        return NextResponse.json({ url: result.url, mode: "stored" });
      }

      if (chargeId) {
        const settleResult = await settleChargeIfAuthorized({
          chargeId,
          payerEmail: session.email,
          paidCents: amountCents,
        });
        if (!settleResult.ok) {
          return NextResponse.json({ error: settleResult.error }, { status: 400 });
        }
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
      if (chargeId) {
        const settleResult = await settleChargeIfAuthorized({
          chargeId,
          payerEmail: session.email,
          paidCents: amountCents,
        });
        if (!settleResult.ok) {
          return NextResponse.json({ error: settleResult.error }, { status: 400 });
        }
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
      ...stripeCheckoutPaymentOptions,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?payment=success${chargeId ? `&chargeId=${chargeId}` : ""}`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
      metadata,
    });
    return NextResponse.json({ url: checkout.url, mode: "checkout" });
  } catch {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
