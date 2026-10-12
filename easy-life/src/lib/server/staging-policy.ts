import type { UserRole } from "@/lib/types";

/** Super admins bypass staging; all other roles are blocked when their club is in staging. */
export function isRoleBlockedDuringStaging(role: UserRole | string): boolean {
  return role !== "admin";
}

export function shouldBlockSessionForStaging(
  role: UserRole | string,
  communityId: string | null | undefined,
  stagingMode: boolean,
): boolean {
  if (!communityId || !stagingMode) return false;
  return isRoleBlockedDuringStaging(role);
}
