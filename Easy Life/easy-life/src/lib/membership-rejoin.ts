export type MembershipStatus = "active" | "resigned" | "deactivated";

export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntilIso(isoDate: string, asOf = new Date()): number {
  const target = new Date(`${isoDate}T12:00:00`);
  const start = new Date(asOf);
  start.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function evaluateRejoinEligibility(input: {
  policyEnabled: boolean;
  waitDays: number;
  resignedAt?: Date | string | null;
  rejoinEligibleOn?: string | null;
  asOf?: Date;
}): {
  waiting: boolean;
  eligible: boolean;
  daysRemaining: number | null;
  eligibleOn: string | null;
} {
  if (!input.policyEnabled) {
    return { waiting: false, eligible: true, daysRemaining: null, eligibleOn: null };
  }

  const asOf = input.asOf ?? new Date();
  let eligibleOn = input.rejoinEligibleOn ?? null;
  if (!eligibleOn && input.resignedAt) {
    const resigned =
      typeof input.resignedAt === "string"
        ? new Date(input.resignedAt)
        : input.resignedAt;
    eligibleOn = addDaysIso(resigned, input.waitDays);
  }
  if (!eligibleOn) {
    return { waiting: false, eligible: true, daysRemaining: null, eligibleOn: null };
  }

  const daysRemaining = daysUntilIso(eligibleOn, asOf);
  if (daysRemaining > 0) {
    return { waiting: true, eligible: false, daysRemaining, eligibleOn };
  }
  return { waiting: false, eligible: true, daysRemaining: 0, eligibleOn };
}

export function rejoinWaitMessage(input: {
  memberName: string;
  waitDays: number;
  daysRemaining: number | null;
  eligibleOn: string | null;
  forStaff?: boolean;
}): string {
  const when = input.eligibleOn ? ` (eligible ${input.eligibleOn})` : "";
  const remain =
    input.daysRemaining != null && input.daysRemaining > 0
      ? ` ${input.daysRemaining} day${input.daysRemaining === 1 ? "" : "s"} remaining`
      : "";
  if (input.forStaff) {
    return `${input.memberName} resigned and is in the ${input.waitDays}-day rejoin wait.${remain}${when}.`;
  }
  if (input.daysRemaining != null && input.daysRemaining <= 0) {
    return `You are eligible to reapply for membership${when}. Contact the club to reinstate.`;
  }
  return `This club requires a ${input.waitDays}-day wait after resignation before rejoining.${remain}${when}.`;
}
