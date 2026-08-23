/**
 * Apple Pay / Google Pay PaymentIntent rules.
 * Linked MemberCharge rows must never settle from a client-supplied amount.
 */

export type WalletPayKind = "hoa" | "charge" | "amount";

export function normalizeWalletPayKind(raw: unknown): WalletPayKind {
  if (raw === "hoa" || raw === "charge" || raw === "amount") return raw;
  return "amount";
}

/**
 * kind=amount is ad-hoc only (no chargeId in Stripe metadata).
 * kind=charge requires a chargeId that the route will load and price from the DB.
 */
export function validateWalletPayKind(input: {
  kind: WalletPayKind;
  chargeId?: string | null;
}): { ok: true } | { ok: false; error: string; status: number } {
  const chargeId = input.chargeId?.trim() || undefined;

  if (input.kind === "amount" && chargeId) {
    return {
      ok: false,
      error:
        "Linked charges require kind=charge so the amount is taken from the server record",
      status: 400,
    };
  }

  if (input.kind === "charge" && !chargeId) {
    return { ok: false, error: "chargeId required", status: 400 };
  }

  return { ok: true };
}

/**
 * Webhook must refuse settlement when metadata amountCents disagrees with
 * what Stripe collected on the PaymentIntent.
 */
export function walletIntentAmountMatchesMetadata(opts: {
  intentAmount: number | null | undefined;
  metadataAmountCents: string | null | undefined;
}): boolean {
  if (opts.metadataAmountCents == null || opts.metadataAmountCents === "") {
    // Legacy intents without amountCents — do not block.
    return true;
  }
  const expected = Number(opts.metadataAmountCents);
  if (!Number.isFinite(expected) || expected <= 0) return false;
  if (opts.intentAmount == null) return false;
  return opts.intentAmount === expected;
}
