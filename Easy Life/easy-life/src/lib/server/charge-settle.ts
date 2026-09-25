import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { prisma } from "@/lib/server/prisma";
import { updateMemberChargeStatus } from "@/lib/server/records";

/** Open balances that QuickPay / autopay may collect. */
export const OPEN_CHARGE_STATUSES: string[] = ["due", "overdue"];

export async function settleMemberCharge(chargeId: string): Promise<void> {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.status === "paid") return;
  if (charge.referenceType === "hoa_assessment") {
    await markHoaChargePaid(chargeId);
    return;
  }
  await updateMemberChargeStatus(chargeId, "paid");
  await activateSharedCalendarByCharge(chargeId);
  await markEscrowHeldByCharge(chargeId);
}

/**
 * Settle a pay-all wallet PaymentIntent: every id must be an open charge owned by
 * the payer, and the collected cents must cover the DB total.
 */
export async function settlePayAllCharges(input: {
  chargeIds: string[];
  memberEmail: string;
  paidCents: number;
}): Promise<{ settled: string[] } | { error: string }> {
  const email = input.memberEmail.toLowerCase();
  const ids = [...new Set(input.chargeIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "No charges" };

  const charges = await prisma.memberCharge.findMany({
    where: { id: { in: ids } },
  });
  if (charges.length !== ids.length) {
    return { error: "Charge not found" };
  }
  for (const charge of charges) {
    if ((charge.memberEmail ?? "").toLowerCase() !== email) {
      return { error: "Charge ownership mismatch" };
    }
    if (charge.status === "paid" || charge.status === "cancelled") {
      return { error: "Charge not open" };
    }
  }

  const dueCents = Math.round(
    charges.reduce((sum, c) => sum + c.amount, 0) * 100,
  );
  if (dueCents <= 0 || input.paidCents < dueCents) {
    return { error: "Paid amount does not cover charges" };
  }

  const settled: string[] = [];
  for (const charge of charges) {
    await settleMemberCharge(charge.id);
    settled.push(charge.id);
  }
  return { settled };
}

export function parseChargeIdsMetadata(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
