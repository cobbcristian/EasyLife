/**
 * Unified charge payment resolution and settlement.
 *
 * All paths that mark a MemberCharge paid MUST go through this module:
 * - Checkout session + webhook
 * - Wallet PaymentIntent + webhook
 * - Stored-card charge
 * - Demo/sandbox mode
 * - Admin mark-paid (if applicable)
 *
 * Core invariants:
 * 1. Charge must exist and be open (status !== "paid")
 * 2. Payer email must match charge.memberEmail (case-insensitive)
 * 3. Paid amount (cents) must cover charge.amount * 100
 */

import { prisma } from "@/lib/server/prisma";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";

export type ChargeResolutionResult =
  | { ok: true; charge: ResolvedCharge }
  | { ok: false; error: string; status: number };

export interface ResolvedCharge {
  id: string;
  communityId: string;
  memberEmail: string;
  memberName: string;
  category: string;
  description: string;
  amount: number;
  amountCents: number;
  status: string;
}

export type SettleResult =
  | { ok: true; settled: true }
  | { ok: false; error: string };

/**
 * Resolve an owned, open charge for payment.
 * Returns the charge with server-authoritative amount if valid.
 */
export async function resolveOwnedOpenCharge(
  chargeId: string,
  payerEmail: string,
): Promise<ChargeResolutionResult> {
  const charge = await prisma.memberCharge.findUnique({
    where: { id: chargeId },
  });

  if (!charge) {
    return { ok: false, error: "Charge not found", status: 404 };
  }

  if (charge.status === "paid") {
    return { ok: false, error: "Charge already paid", status: 400 };
  }

  const chargeEmail = (charge.memberEmail ?? "").toLowerCase();
  const payer = payerEmail.toLowerCase();

  if (!chargeEmail || chargeEmail !== payer) {
    return { ok: false, error: "Not authorized to pay this charge", status: 403 };
  }

  return {
    ok: true,
    charge: {
      id: charge.id,
      communityId: charge.communityId,
      memberEmail: chargeEmail,
      memberName: charge.memberName,
      category: charge.category,
      description: charge.description,
      amount: charge.amount,
      amountCents: Math.round(charge.amount * 100),
      status: charge.status,
    },
  };
}

/**
 * Settle a charge after payment confirmation.
 * Verifies ownership, amount coverage, and charge is still open.
 * Activates side effects (shared calendar, escrow hold).
 */
export async function settleChargeIfAuthorized(opts: {
  chargeId: string;
  payerEmail: string;
  paidCents: number;
}): Promise<SettleResult> {
  const { chargeId, payerEmail, paidCents } = opts;

  const charge = await prisma.memberCharge.findUnique({
    where: { id: chargeId },
  });

  if (!charge) {
    return { ok: false, error: "Charge not found" };
  }

  if (charge.status === "paid") {
    return { ok: true, settled: true };
  }

  const chargeEmail = (charge.memberEmail ?? "").toLowerCase();
  const payer = payerEmail.toLowerCase();

  if (!chargeEmail || chargeEmail !== payer) {
    return { ok: false, error: "Not authorized to settle this charge" };
  }

  const requiredCents = Math.round(charge.amount * 100);
  if (paidCents < requiredCents) {
    return {
      ok: false,
      error: `Payment ${paidCents} cents does not cover charge ${requiredCents} cents`,
    };
  }

  if (charge.category === "hoa") {
    await markHoaChargePaid(chargeId);
  } else {
    await prisma.memberCharge.update({
      where: { id: chargeId },
      data: { status: "paid" },
    });
    await activateSharedCalendarByCharge(chargeId);
    await markEscrowHeldByCharge(chargeId);
  }

  return { ok: true, settled: true };
}

/**
 * Build Stripe metadata for a charge payment session.
 * Always includes userEmail and amountCents for webhook verification.
 */
export function buildChargeMetadata(
  charge: ResolvedCharge,
  userEmail: string,
): Record<string, string> {
  return {
    chargeId: charge.id,
    userEmail: userEmail.toLowerCase(),
    amountCents: String(charge.amountCents),
    ...(charge.category === "hoa" ? { type: "hoa" } : {}),
  };
}

/**
 * Verify Stripe webhook metadata matches expected values.
 * Returns the chargeId if valid, null otherwise.
 */
export function verifyWebhookMetadata(
  metadata: Record<string, string> | null | undefined,
  capturedAmountCents: number,
): { chargeId: string; userEmail: string } | null {
  if (!metadata?.chargeId || !metadata?.userEmail || !metadata?.amountCents) {
    return null;
  }

  const expectedCents = parseInt(metadata.amountCents, 10);
  if (isNaN(expectedCents) || capturedAmountCents < expectedCents) {
    return null;
  }

  return {
    chargeId: metadata.chargeId,
    userEmail: metadata.userEmail,
  };
}
