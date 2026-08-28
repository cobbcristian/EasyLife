import {
  activateSharedCalendarByCharge,
  markEscrowHeldByCharge,
} from "@/lib/server/local-pros";
import { markHoaChargePaid } from "@/lib/server/hoa-dues";
import { prisma } from "@/lib/server/prisma";
import { updateMemberChargeStatus } from "@/lib/server/records";

/** True when Stripe Checkout has collected funds (not merely session-complete). */
export function checkoutSessionIsPaid(
  paymentStatus: string | null | undefined,
): boolean {
  return paymentStatus === "paid";
}

/** Metadata + return URL so SCA / wallet success can settle the linked charge. */
export function storedChargeIntentOptions(input: {
  chargeId?: string;
  chargeCategory?: string | null;
  appUrl: string;
}): { metadata: Record<string, string>; returnUrl: string } {
  const metadata: Record<string, string> = {};
  if (input.chargeId) {
    metadata.chargeId = input.chargeId;
    if (input.chargeCategory === "hoa") {
      metadata.type = "hoa";
    }
  }
  const qs = new URLSearchParams({ payment: "success" });
  if (input.chargeId) qs.set("chargeId", input.chargeId);
  return {
    metadata,
    returnUrl: `${input.appUrl.replace(/\/$/, "")}/member/payments?${qs.toString()}`,
  };
}

/**
 * Mark a MemberCharge paid and run category-specific side effects.
 * HOA charges must clear UnitHoaFee.currentBalance via markHoaChargePaid —
 * a bare status update leaves the unit balance open and re-bills the member.
 */
export async function settleMemberChargePaid(chargeId: string): Promise<void> {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (!charge) return;

  if (charge.category === "hoa") {
    await markHoaChargePaid(chargeId);
    return;
  }

  await updateMemberChargeStatus(chargeId, "paid");
  await activateSharedCalendarByCharge(chargeId);
  await markEscrowHeldByCharge(chargeId);
}
