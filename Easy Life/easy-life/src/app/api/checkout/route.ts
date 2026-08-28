import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  chargeStoredPaymentMethod,
  getPaymentSettings,
} from "@/lib/server/payment-methods";
import { prisma } from "@/lib/server/prisma";
import { settleMemberChargePaid } from "@/lib/server/settle-charge";
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

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const returnPath = body.returnPath ?? "/member/payments";
  const description = body.description ?? "Club payment";

  let chargeCategory: string | null | undefined;
  if (body.chargeId) {
    const linked = await prisma.memberCharge.findUnique({
      where: { id: body.chargeId },
      select: { category: true, memberEmail: true },
    });
    if (
      linked &&
      linked.memberEmail?.toLowerCase() === session.email.toLowerCase()
    ) {
      chargeCategory = linked.category;
    }
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
        chargeId: body.chargeId,
        chargeCategory,
      });

      if (result.status === "action_required" && result.url) {
        // Do not settle yet — webhook / success return URL settles after SCA.
        return NextResponse.json({ url: result.url, mode: "stored" });
      }

      if (body.chargeId) {
        await settleMemberChargePaid(body.chargeId);
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
        await settleMemberChargePaid(body.chargeId);
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
    const metadata: Record<string, string> = {
      userEmail: session.email,
    };
    if (body.chargeId) {
      metadata.chargeId = body.chargeId;
      if (chargeCategory === "hoa") metadata.type = "hoa";
    }

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
      success_url: `${origin}${returnPath}?payment=success${body.chargeId ? `&chargeId=${body.chargeId}` : ""}`,
      cancel_url: `${origin}${returnPath}?payment=cancelled`,
      metadata: body.chargeId ? metadata : undefined,
    });
    return NextResponse.json({ url: checkout.url, mode: "checkout" });
  } catch {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
