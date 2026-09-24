import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isStripeConfigured } from "@/lib/server/stripe";
import { isDemoPaymentAllowed } from "@/lib/server/demo-mode";
import { resolveOwnedOpenCharge, settleChargeIfAuthorized } from "@/lib/server/charge-payment";

/**
 * Manual mark-paid endpoint.
 *
 * When Stripe is configured, this endpoint is disabled — charges must be
 * settled through the webhook after actual payment. This prevents members
 * from navigating to ?payment=success&chargeId=... and getting free credits.
 *
 * In demo mode (no Stripe), this allows testing the payment flow.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { chargeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.chargeId) {
    return NextResponse.json({ error: "chargeId required" }, { status: 400 });
  }

  if (isStripeConfigured()) {
    return NextResponse.json(
      { error: "Manual settlement is disabled when Stripe is configured" },
      { status: 403 },
    );
  }

  if (!isDemoPaymentAllowed()) {
    return NextResponse.json(
      { error: "Manual settlement requires ALLOW_DEMO_PAYMENTS=1" },
      { status: 403 },
    );
  }

  const resolved = await resolveOwnedOpenCharge(body.chargeId, session.email);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const settleResult = await settleChargeIfAuthorized({
    chargeId: body.chargeId,
    payerEmail: session.email,
    paidCents: resolved.charge.amountCents,
  });

  if (!settleResult.ok) {
    return NextResponse.json({ error: settleResult.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
