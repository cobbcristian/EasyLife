import type { AuthRole } from "@/lib/types";

const STAFF_ROLES = new Set<AuthRole>(["admin", "pm", "board"]);

/** Club staff who may manage profiles at all. */
export function canEditStaffProfiles(role: string | undefined): boolean {
  return role === "admin" || role === "pm" || role === "board";
}

export function isStaffRole(role: string): role is AuthRole {
  return STAFF_ROLES.has(role as AuthRole);
}

/**
 * Only club admins may create/promote to admin or mutate an existing admin.
 * PM/board can still manage other PM/board profiles.
 */
export function canAssignStaffRole(
  actorRole: string | undefined,
  targetRole: string,
): boolean {
  if (!canEditStaffProfiles(actorRole) || !isStaffRole(targetRole)) return false;
  if (targetRole === "admin") return actorRole === "admin";
  return true;
}

export function canMutateStaffMember(
  actorRole: string | undefined,
  targetCurrentRole: string,
): boolean {
  if (!canEditStaffProfiles(actorRole)) return false;
  if (targetCurrentRole === "admin") return actorRole === "admin";
  return true;
}

export function assignableStaffRoles(actorRole: string | undefined): AuthRole[] {
  if (actorRole === "admin") return ["admin", "pm", "board"];
  if (actorRole === "pm" || actorRole === "board") return ["pm", "board"];
  return [];
}
