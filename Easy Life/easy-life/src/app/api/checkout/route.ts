import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listOpenDueChargesForMember,
  settleMemberCharge,
  settlePayAllCharges,
} from "@/lib/server/charge-settle";
import {
  chargeStoredPaymentMethod,
  getPaymentSettings,
} from "@/lib/server/payment-methods";
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
  const description = body.description ?? "Club payment";

  let amount: number;
  let chargeId: string | undefined = body.chargeId;
  let payAllChargeIds: string[] | undefined;
  let checkoutMetadata: Record<string, string> | undefined;

  if (!body.chargeId) {
    // QuickPay / pay-all: never trust client amount; resolve open dues server-side.
    const openPositive = await listOpenDueChargesForMember({
      memberEmail: session.email,
      communityId: session.communityId,
    });
    if (openPositive.length === 0) {
      return NextResponse.json({ error: "Nothing due" }, { status: 400 });
    }
    amount = openPositive.reduce((sum, c) => sum + c.amount, 0);
    payAllChargeIds = openPositive.map((c) => c.id);
    const amountCents = Math.round(amount * 100);
    checkoutMetadata = {
      kind: "pay_all",
      chargeIds: payAllChargeIds.join(","),
      amountCents: String(amountCents),
      userEmail: session.email,
    };
  } else {
    const clientAmount = Number(body.amount);
    if (!clientAmount || clientAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    amount = clientAmount;
    checkoutMetadata = {
      chargeId: body.chargeId,
      userEmail: session.email,
    };
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
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
        metadata: checkoutMetadata,
      });

      if (result.status === "action_required" && result.url) {
        return NextResponse.json({ url: result.url, mode: "stored" });
      }

      if (payAllChargeIds) {
        const settled = await settlePayAllCharges({
          chargeIds: payAllChargeIds,
          memberEmail: session.email,
          paidCents: Math.round(amount * 100),
        });
        if ("error" in settled) {
          return NextResponse.json({ error: settled.error }, { status: 400 });
        }
      } else if (chargeId) {
        await settleMemberCharge(chargeId);
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
      if (payAllChargeIds) {
        const settled = await settlePayAllCharges({
          chargeIds: payAllChargeIds,
          memberEmail: session.email,
          paidCents: Math.round(amount * 100),
        });
        if ("error" in settled) {
          return NextResponse.json({ error: settled.error }, { status: 400 });
        }
      } else if (chargeId) {
        await settleMemberCharge(chargeId);
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
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}${returnPath}?payment=success${chargeId ? `&chargeId=${chargeId}` : ""}`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
      metadata: checkoutMetadata,
    });
    return NextResponse.json({ url: checkout.url, mode: "checkout" });
  } catch {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
