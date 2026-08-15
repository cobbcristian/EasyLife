/**
 * Server-side charge settlement helpers.
 * Checkout amounts and paid status must never be trusted from the client alone.
 */

export type ChargeForPayment = {
  id: string;
  amount: number;
  status: string;
  memberEmail: string | null;
  communityId: string;
  description: string;
};

export type ResolveCheckoutAmountResult =
  | {
      ok: true;
      amount: number;
      amountCents: number;
      description: string;
      chargeId?: string;
    }
  | { ok: false; error: string; status: number };

/**
 * When a chargeId is present, amount and description come from the DB charge
 * owned by the payer — never from the client body.
 */
export function resolveCheckoutAmount(input: {
  charge: ChargeForPayment | null | undefined;
  chargeId?: string | null;
  clientAmount?: number | null;
  clientDescription?: string | null;
  memberEmail: string;
  communityId?: string | null;
}): ResolveCheckoutAmountResult {
  const { charge, chargeId, clientAmount, clientDescription, memberEmail, communityId } =
    input;

  if (chargeId) {
    if (!charge) {
      return { ok: false, error: "Charge not found", status: 404 };
    }
    if (charge.status === "paid") {
      return { ok: false, error: "Charge already paid", status: 409 };
    }
    const email = charge.memberEmail?.trim().toLowerCase();
    if (!email || email !== memberEmail.trim().toLowerCase()) {
      return { ok: false, error: "Charge not found", status: 404 };
    }
    if (communityId && charge.communityId !== communityId) {
      return { ok: false, error: "Charge not found", status: 404 };
    }
    const amount = Number(charge.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Invalid charge amount", status: 400 };
    }
    return {
      ok: true,
      amount,
      amountCents: Math.round(amount * 100),
      description: charge.description || clientDescription || "Club payment",
      chargeId: charge.id,
    };
  }

  const amount = Number(clientAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Invalid amount", status: 400 };
  }
  return {
    ok: true,
    amount,
    amountCents: Math.round(amount * 100),
    description: clientDescription?.trim() || "Club payment",
  };
}

/**
 * Client return URLs (?payment=success) are not proof of payment.
 * Only demo mode may settle from that redirect; production relies on Stripe webhooks
 * (or the stored-card / demo paths that settle server-side after a real charge).
 */
export function canSettleChargeFromClientRedirect(opts: {
  stripeConfigured: boolean;
  demoPaymentsAllowed: boolean;
}): boolean {
  if (opts.stripeConfigured) return false;
  return opts.demoPaymentsAllowed;
}

/**
 * Webhook must refuse to mark a charge paid when metadata amount does not match
 * what Stripe actually collected.
 */
export function webhookPaymentMatchesCharge(opts: {
  amountTotal: number | null | undefined;
  metadataAmountCents: string | null | undefined;
}): boolean {
  if (opts.metadataAmountCents == null || opts.metadataAmountCents === "") {
    // Legacy sessions without amountCents — do not block, but new checkouts always set it.
    return true;
  }
  const expected = Number(opts.metadataAmountCents);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  if (opts.amountTotal == null) return false;
  return opts.amountTotal === expected;
}
