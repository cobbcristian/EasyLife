import { isSuperAdmin } from "@/lib/server/community-context";
import type { SessionPayload } from "@/lib/types";

/**
 * Scope for GET /api/admin/overview.
 * - Super admins (platform admin, no communityId): null = all clubs.
 * - Club admins: must be limited to their own communityId.
 * - Admin without a communityId who is not a super admin: empty sentinel (deny-all).
 */
export function adminOverviewCommunityScope(
  session: Pick<SessionPayload, "role" | "communityId">,
): string | null {
  if (isSuperAdmin(session as SessionPayload)) return null;
  if (session.role === "admin" && session.communityId) {
    return session.communityId;
  }
  // Fail closed: never dump every tenant to an unscoped admin session.
  return "__no_community__";
}
