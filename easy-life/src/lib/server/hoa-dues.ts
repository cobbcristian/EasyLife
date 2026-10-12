import {
  communityIsResidentialHoa,
  communitySupportsInAppHoaCheckout,
} from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";

export const OCEANSIDE_HOA_PRODUCT = {
  name: "Oceanside HOA Dues",
  description: "HOA assessment payments for units at The Plaza at Oceanside",
} as const;

/** Known Plaza unit assessments (USD / month). Seed + lookup fallback. */
export const OCEANSIDE_UNIT_MONTHLY_FEES: Record<string, number> = {
  "1112": 875,
  "1205": 1025,
  "1501": 1340,
  "402": 875,
};

function billingPeriodId(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function hoaBillableAmount(fee: {
  monthlyAmount: number;
  currentBalance: number | null;
}): number {
  if (fee.currentBalance != null && Number.isFinite(fee.currentBalance)) {
    return Math.round(fee.currentBalance * 100) / 100;
  }
  return Math.round(fee.monthlyAmount * 100) / 100;
}

export async function getUnitHoaFee(communityId: string, unit: string) {
  const normalized = unit.trim();
  if (!normalized) return null;
  return prisma.unitHoaFee.findUnique({
    where: {
      communityId_unit: { communityId, unit: normalized },
    },
  });
}

export async function upsertUnitHoaFee(input: {
  communityId: string;
  unit: string;
  monthlyAmount: number;
  currentBalance?: number | null;
}) {
  const unit = input.unit.trim();
  return prisma.unitHoaFee.upsert({
    where: {
      communityId_unit: { communityId: input.communityId, unit },
    },
    create: {
      communityId: input.communityId,
      unit,
      monthlyAmount: input.monthlyAmount,
      currentBalance: input.currentBalance ?? null,
    },
    update: {
      monthlyAmount: input.monthlyAmount,
      ...(input.currentBalance !== undefined
        ? { currentBalance: input.currentBalance }
        : {}),
    },
  });
}

export async function syncOceansideUnitHoaFees(): Promise<void> {
  const communityId = "oceanside-residents";
  for (const [unit, monthlyAmount] of Object.entries(OCEANSIDE_UNIT_MONTHLY_FEES)) {
    await upsertUnitHoaFee({ communityId, unit, monthlyAmount });
  }
}

export type ResolvedHoaPayment = {
  communityId: string;
  unit: string;
  amount: number;
  chargeId: string;
  productName: string;
  productDescription: string;
  periodId: string;
};

/**
 * Resolve the exact HOA amount for a resident from their unit record.
 * Creates or refreshes an open MemberCharge so webhook can mark it paid.
 * Never trusts a client-supplied amount.
 */
export async function resolveHoaPaymentForMember(opts: {
  communityId: string;
  memberEmail: string;
  memberName: string;
}): Promise<
  | { ok: true; payment: ResolvedHoaPayment }
  | { ok: false; error: string; status: number }
> {
  const { communityId, memberEmail, memberName } = opts;

  if (!communityIsResidentialHoa(communityId)) {
    return {
      ok: false,
      error: "In-app HOA checkout is not available for this community.",
      status: 400,
    };
  }
  if (!communitySupportsInAppHoaCheckout(communityId)) {
    return {
      ok: false,
      error: "In-app HOA checkout is not enabled for this community.",
      status: 400,
    };
  }

  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: memberEmail },
    select: { unit: true, paysHoa: true, residencyStatus: true },
  });

  if (!profile?.paysHoa) {
    return {
      ok: false,
      error: "Your account is not set up for HOA assessments.",
      status: 403,
    };
  }

  const unit = profile.unit?.trim();
  if (!unit || unit.toLowerCase() === "mgmt") {
    return {
      ok: false,
      error: "No unit is linked to your account. Contact association management.",
      status: 400,
    };
  }

  let fee = await getUnitHoaFee(communityId, unit);
  if (!fee) {
    const fallback = OCEANSIDE_UNIT_MONTHLY_FEES[unit];
    if (fallback == null) {
      return {
        ok: false,
        error: `No HOA fee is on file for unit ${unit}. Contact association management.`,
        status: 404,
      };
    }
    fee = await upsertUnitHoaFee({
      communityId,
      unit,
      monthlyAmount: fallback,
    });
  }

  const periodId = billingPeriodId();
  const openBalance =
    fee.currentBalance != null && Number.isFinite(fee.currentBalance)
      ? Math.round(fee.currentBalance * 100) / 100
      : null;

  // Explicit zero/negative open balance = nothing due (credits / paid).
  if (openBalance != null && openBalance <= 0) {
    return {
      ok: false,
      error: "Your HOA balance is paid in full.",
      status: 400,
    };
  }

  // Monthly assessment already paid this period, and no extra open balance.
  if (openBalance == null) {
    const paidThisPeriod = await prisma.memberCharge.findFirst({
      where: {
        communityId,
        memberEmail,
        category: "hoa",
        status: "paid",
        referenceType: "hoa_assessment",
        referenceId: periodId,
      },
    });
    if (paidThisPeriod) {
      return {
        ok: false,
        error: "Your HOA balance is paid in full for this period.",
        status: 400,
      };
    }
  }

  const amount =
    openBalance != null
      ? openBalance
      : Math.round(fee.monthlyAmount * 100) / 100;
  if (amount <= 0) {
    return {
      ok: false,
      error: "Your HOA balance is paid in full.",
      status: 400,
    };
  }

  const existing = await prisma.memberCharge.findFirst({
    where: {
      communityId,
      memberEmail,
      category: "hoa",
      status: { not: "paid" },
    },
    orderBy: { createdAt: "desc" },
  });

  let chargeId: string;
  if (existing) {
    if (existing.amount !== amount) {
      await prisma.memberCharge.update({
        where: { id: existing.id },
        data: {
          amount,
          description: `${OCEANSIDE_HOA_PRODUCT.name} · Unit ${unit} · ${periodId}`,
          referenceType: "hoa_assessment",
          referenceId: periodId,
        },
      });
    }
    chargeId = existing.id;
  } else {
    const created = await prisma.memberCharge.create({
      data: {
        communityId,
        memberEmail,
        memberName,
        category: "hoa",
        description: `${OCEANSIDE_HOA_PRODUCT.name} · Unit ${unit} · ${periodId}`,
        amount,
        status: "due",
        dueDate: new Date().toISOString().slice(0, 10),
        referenceType: "hoa_assessment",
        referenceId: periodId,
      },
    });
    chargeId = created.id;
  }

  return {
    ok: true,
    payment: {
      communityId,
      unit,
      amount,
      chargeId,
      productName: OCEANSIDE_HOA_PRODUCT.name,
      productDescription: OCEANSIDE_HOA_PRODUCT.description,
      periodId,
    },
  };
}

export async function markHoaChargePaid(chargeId: string): Promise<void> {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (!charge || charge.category !== "hoa") {
    await prisma.memberCharge.update({
      where: { id: chargeId },
      data: { status: "paid" },
    });
    return;
  }

  await prisma.memberCharge.update({
    where: { id: chargeId },
    data: { status: "paid" },
  });

  const profile = charge.memberEmail
    ? await prisma.memberProfileExt.findUnique({
        where: { userEmail: charge.memberEmail },
        select: { unit: true },
      })
    : null;
  const unit = profile?.unit?.trim();
  if (!unit) return;

  const fee = await getUnitHoaFee(charge.communityId, unit);
  if (!fee) return;

  // Clear open-balance override after payment. Next period bills monthlyAmount
  // unless management sets a new currentBalance (late fees / special assessment).
  await prisma.unitHoaFee.update({
    where: { id: fee.id },
    data: { currentBalance: null },
  });
}
