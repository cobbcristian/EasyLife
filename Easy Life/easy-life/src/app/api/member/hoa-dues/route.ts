import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  communityHoaPaymentPortal,
  communitySupportsInAppHoaCheckout,
} from "@/lib/community-features";
import {
  hoaBillableAmount,
  getUnitHoaFee,
  OCEANSIDE_HOA_PRODUCT,
  OCEANSIDE_UNIT_MONTHLY_FEES,
  resolveHoaPaymentForMember,
} from "@/lib/server/hoa-dues";
import { prisma } from "@/lib/server/prisma";

/** Returns the resident's unit HOA amount for the Payments UI (read-only). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const communityId = session.communityId;
  const inApp = communitySupportsInAppHoaCheckout(communityId);
  const legacyPortal = communityHoaPaymentPortal(communityId);

  if (!inApp) {
    return NextResponse.json({
      inAppCheckout: false,
      legacyPortal,
      dues: null,
    });
  }

  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: session.email },
    select: { unit: true, paysHoa: true },
  });

  if (!profile?.paysHoa || !profile.unit?.trim()) {
    return NextResponse.json({
      inAppCheckout: true,
      legacyPortal,
      product: OCEANSIDE_HOA_PRODUCT,
      dues: null,
    });
  }

  const unit = profile.unit.trim();
  let fee = await getUnitHoaFee(communityId, unit);
  if (!fee && OCEANSIDE_UNIT_MONTHLY_FEES[unit] != null) {
    fee = {
      id: "",
      communityId,
      unit,
      monthlyAmount: OCEANSIDE_UNIT_MONTHLY_FEES[unit],
      currentBalance: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const amountDue = fee ? hoaBillableAmount(fee) : null;
  const resolved =
    amountDue != null && amountDue > 0
      ? await resolveHoaPaymentForMember({
          communityId,
          memberEmail: session.email,
          memberName: session.name ?? session.email,
        })
      : null;

  return NextResponse.json({
    inAppCheckout: true,
    legacyPortal,
    product: OCEANSIDE_HOA_PRODUCT,
    dues: fee
      ? {
          unit,
          monthlyAmount: fee.monthlyAmount,
          amountDue: amountDue ?? 0,
          chargeId:
            resolved && resolved.ok ? resolved.payment.chargeId : null,
          periodId:
            resolved && resolved.ok ? resolved.payment.periodId : null,
        }
      : { unit, monthlyAmount: null, amountDue: null, chargeId: null, periodId: null },
  });
}
