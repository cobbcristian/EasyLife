import { prisma } from "@/lib/server/prisma";
import {
  assertEventHasCapacity,
  ClinicCapacityError,
} from "@/lib/server/clinics";
import { createMemberCharge } from "@/lib/server/records";

/** Member (or logged-in) event/clinic fee settled via checkout / Stripe. */
export const EVENT_FEE_REFERENCE = "event_fee";

export type EventFeeChargeView = {
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  memberEmail: string | null;
  amount: number;
};

/**
 * True when a charge proves this member already paid the required event fee.
 * Never trust a client `paid: true` flag — only a paid MemberCharge row.
 */
export function isVerifiedPaidEventFee(
  charge: EventFeeChargeView,
  opts: { eventId: string; memberEmail: string; minAmountDollars: number },
): boolean {
  if (charge.status !== "paid") return false;
  if (charge.referenceType !== EVENT_FEE_REFERENCE) return false;
  if (charge.referenceId !== opts.eventId) return false;
  const email = (charge.memberEmail ?? "").trim().toLowerCase();
  if (!email || email !== opts.memberEmail.trim().toLowerCase()) return false;
  if (charge.amount + 0.001 < opts.minAmountDollars) return false;
  return true;
}

export async function findPaidEventFeeCharge(input: {
  eventId: string;
  memberEmail: string;
  minAmountDollars: number;
}) {
  const email = input.memberEmail.trim().toLowerCase();
  const charges = await prisma.memberCharge.findMany({
    where: {
      referenceType: EVENT_FEE_REFERENCE,
      referenceId: input.eventId,
      memberEmail: email,
      status: "paid",
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    charges.find((c) =>
      isVerifiedPaidEventFee(c, {
        eventId: input.eventId,
        memberEmail: email,
        minAmountDollars: input.minAmountDollars,
      }),
    ) ?? null
  );
}

export async function memberHasPaidEventFee(input: {
  eventId: string;
  memberEmail: string;
  minAmountDollars: number;
}): Promise<boolean> {
  const paid = await findPaidEventFeeCharge(input);
  return paid != null;
}

/** Reuse an open due charge or create one so checkout can settle by chargeId. */
export async function ensureMemberEventFeeCharge(input: {
  communityId: string;
  eventId: string;
  eventTitle: string;
  memberName: string;
  memberEmail: string;
  amountDollars: number;
  description: string;
}) {
  const email = input.memberEmail.trim().toLowerCase();
  const existing = await prisma.memberCharge.findFirst({
    where: {
      referenceType: EVENT_FEE_REFERENCE,
      referenceId: input.eventId,
      memberEmail: email,
      status: "due",
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (Math.abs(existing.amount - input.amountDollars) > 0.009) {
      return prisma.memberCharge.update({
        where: { id: existing.id },
        data: {
          amount: input.amountDollars,
          description: input.description,
          memberName: input.memberName,
        },
      });
    }
    return existing;
  }
  return createMemberCharge({
    communityId: input.communityId,
    memberEmail: email,
    memberName: input.memberName,
    category: "event",
    description: input.description,
    amount: input.amountDollars,
    status: "due",
    referenceType: EVENT_FEE_REFERENCE,
    referenceId: input.eventId,
  });
}

/**
 * After Stripe / stored-card settlement: mark paid and create the RSVP.
 * Safe to call repeatedly (idempotent upsert).
 */
export async function markEventFeePaidAndRsvp(chargeId: string) {
  const charge = await prisma.memberCharge.findUnique({ where: { id: chargeId } });
  if (
    !charge ||
    charge.referenceType !== EVENT_FEE_REFERENCE ||
    !charge.referenceId ||
    !charge.memberEmail
  ) {
    return null;
  }

  if (charge.status !== "paid") {
    await prisma.memberCharge.update({
      where: { id: charge.id },
      data: { status: "paid" },
    });
  }

  try {
    await assertEventHasCapacity(charge.referenceId);
  } catch (err) {
    if (err instanceof ClinicCapacityError) return charge;
    throw err;
  }

  const email = charge.memberEmail.trim().toLowerCase();
  await prisma.eventRsvp.upsert({
    where: {
      eventId_memberEmail: {
        eventId: charge.referenceId,
        memberEmail: email,
      },
    },
    create: {
      eventId: charge.referenceId,
      memberEmail: email,
      memberName: charge.memberName,
    },
    update: {},
  });
  await prisma.eventInvite.updateMany({
    where: { eventId: charge.referenceId, memberEmail: email },
    data: { status: "accepted" },
  });
  return charge;
}
