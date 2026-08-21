import type { SessionPayload } from "@/lib/types";
import { canManageCommunity, isSuperAdmin } from "@/lib/server/community-context";

/**
 * Staff may mutate a tenant-scoped resource only if they manage that community
 * (super-admin, or session community matches resource communityId).
 */
export function canMutateCommunityResource(
  session: SessionPayload,
  resourceCommunityId: string | null | undefined,
): boolean {
  if (!resourceCommunityId) return isSuperAdmin(session);
  return canManageCommunity(session, resourceCommunityId);
}
