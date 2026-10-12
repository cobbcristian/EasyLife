import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import {
  addDemoPaymentMethod,
  createStripeSetupCheckout,
  getPaymentSettings,
  syncPaymentMethodsFromStripe,
} from "@/lib/server/payment-methods";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getPaymentSettings(session.email);
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action?: "setup_stripe" | "add_demo";
    returnPath?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    label?: string;
    setDefault?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const returnPath = body.returnPath ?? "/member/payments";

  if (body.action === "setup_stripe") {
    try {
      const url = await createStripeSetupCheckout(
        session.email,
        session.name,
        returnPath,
        origin,
      );
      return NextResponse.json({ url });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Setup unavailable";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  if (body.action === "add_demo") {
    if (!isDemoPaymentAllowed()) {
      return NextResponse.json(
        { error: "Demo payment methods are disabled in production" },
        { status: 403 },
      );
    }
    if (!body.brand || !body.last4 || !body.expMonth || !body.expYear) {
      return NextResponse.json({ error: "Card details required" }, { status: 400 });
    }
    try {
      const settings = await addDemoPaymentMethod(session.email, {
        brand: body.brand,
        last4: body.last4,
        expMonth: Number(body.expMonth),
        expYear: Number(body.expYear),
        label: body.label,
        setDefault: body.setDefault,
      });
      return NextResponse.json(settings);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not add card";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await syncPaymentMethodsFromStripe(session.email);
  return NextResponse.json(settings);
}
