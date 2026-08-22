export type DependentBreachReason = "age" | "address" | "both" | "none";
export type DependentStatus = "active" | "warned" | "must_convert" | "terminated";
export type DependentNoticeLevel =
  | "warning"
  | "final_warning"
  | "must_convert"
  | "terminated";

export function ageInYears(dateOfBirth: string, asOf = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!m) return null;
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(birth.getTime())) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const hadBirthday =
    asOf.getMonth() > birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

export function normalizeAddress(address: string | null | undefined): string {
  return (address ?? "")
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\b(apt|apartment|unit|ste|suite)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function addressesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (!na || !nb) return true; // missing data → don't fail address rule alone
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function birthdayOnAge(
  dateOfBirth: string,
  ageYears: number,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!m) return null;
  const year = Number(m[1]) + ageYears;
  return `${year}-${m[2]}-${m[3]}`;
}

export function daysUntil(isoDate: string, asOf = new Date()): number {
  const target = new Date(`${isoDate}T12:00:00`);
  const start = new Date(asOf);
  start.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function evaluateDependentEligibility(input: {
  dateOfBirth?: string | null;
  householdAddress?: string | null;
  sponsorAddress?: string | null;
  ageOutYears: number;
  requireSameAddress: boolean;
  warnDaysBefore: number;
  asOf?: Date;
}): {
  reason: DependentBreachReason;
  age: number | null;
  ageOutDate: string | null;
  daysUntilAgeOut: number | null;
  addressOk: boolean;
  withinWarnWindow: boolean;
  pastDue: boolean;
  suggestedStatus: DependentStatus;
} {
  const asOf = input.asOf ?? new Date();
  const age = input.dateOfBirth ? ageInYears(input.dateOfBirth, asOf) : null;
  const ageOutDate = input.dateOfBirth
    ? birthdayOnAge(input.dateOfBirth, input.ageOutYears)
    : null;
  const daysUntilAgeOut = ageOutDate ? daysUntil(ageOutDate, asOf) : null;
  const addressOk = input.requireSameAddress
    ? addressesMatch(input.householdAddress, input.sponsorAddress)
    : true;

  const ageBreached = age != null && age >= input.ageOutYears;
  const ageNear =
    daysUntilAgeOut != null &&
    daysUntilAgeOut <= input.warnDaysBefore &&
    daysUntilAgeOut >= 0;
  const addressBreached = input.requireSameAddress && !addressOk;

  let reason: DependentBreachReason = "none";
  if (ageBreached && addressBreached) reason = "both";
  else if (ageBreached || ageNear) reason = addressBreached ? "both" : "age";
  else if (addressBreached) reason = "address";

  const pastDue = ageBreached || addressBreached;
  const withinWarnWindow = !pastDue && (ageNear || addressBreached);

  let suggestedStatus: DependentStatus = "active";
  if (pastDue) suggestedStatus = "must_convert";
  else if (withinWarnWindow || ageNear) suggestedStatus = "warned";

  return {
    reason,
    age,
    ageOutDate,
    daysUntilAgeOut,
    addressOk,
    withinWarnWindow: ageNear || (addressBreached && !pastDue),
    pastDue,
    suggestedStatus,
  };
}

export function noticeMessage(input: {
  dependentName: string;
  ageOutYears: number;
  reason: DependentBreachReason;
  level: DependentNoticeLevel;
  dueDate?: string | null;
  daysLeft?: number | null;
}): string {
  const due = input.dueDate ? ` by ${input.dueDate}` : "";
  if (input.level === "terminated") {
    return `${input.dependentName}'s dependent membership has ended. They must join with their own club membership to continue using club privileges.`;
  }
  if (input.reason === "address") {
    return `${input.dependentName} no longer shares the sponsor household address. Club policy requires dependents to live at the member address or obtain their own membership${due}.`;
  }
  if (input.reason === "both") {
    return `${input.dependentName} is aging out of dependent status (age ${input.ageOutYears}) and no longer matches the sponsor address. Please convert to an individual membership${due}.`;
  }
  if (input.level === "final_warning") {
    return `Final notice: ${input.dependentName} turns ${input.ageOutYears} soon${
      input.daysLeft != null ? ` (in ${input.daysLeft} days)` : ""
    }. Dependent privileges end unless they establish their own membership${due}.`;
  }
  return `Reminder: ${input.dependentName} will age out of your household membership at age ${input.ageOutYears}${
    input.daysLeft != null ? ` in ${input.daysLeft} days` : ""
  }. Please arrange an individual membership before privileges end${due}.`;
}

/**
 * Whether a dependent email belongs to the club whose aging policy is running.
 * Aging must never apply Club A's policy to Club B's dependents.
 */
export function isDependentInCommunityScope(
  dependentEmail: string,
  communityMemberEmails: ReadonlySet<string>,
): boolean {
  return communityMemberEmails.has(dependentEmail.trim().toLowerCase());
}
