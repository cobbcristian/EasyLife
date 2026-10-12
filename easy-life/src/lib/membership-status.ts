import type { MembershipStatus } from "@/lib/membership-rejoin";

export const MEMBERSHIP_NOT_RENEWED_MESSAGE =
  "Your membership has not been renewed. Contact Membership to reactivate.";

export function isMembershipDeactivated(
  status: string | null | undefined,
): boolean {
  return status === "deactivated";
}

export function isMembershipPrivileged(
  status: string | null | undefined,
): boolean {
  return !status || status === "active";
}

export function normalizeMembershipStatus(
  status: string | null | undefined,
): MembershipStatus {
  if (status === "resigned" || status === "deactivated") return status;
  return "active";
}
