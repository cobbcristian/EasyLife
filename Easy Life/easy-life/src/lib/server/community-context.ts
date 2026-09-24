import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/tenant";

export { ACTIVE_COMMUNITY_COOKIE };
export const DEFAULT_COMMUNITY = "__missing_community__";

export function isSuperAdmin(session: SessionPayload): boolean {
  return session.role === "admin" && !session.communityId;
}

export function isClubAdmin(session: SessionPayload): boolean {
  return session.role === "admin" && !!session.communityId;
}

export async function getActiveCommunityCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_COMMUNITY_COOKIE)?.value;
  if (!value) return null;
  const exists = await prisma.community.findUnique({ where: { id: value }, select: { id: true } });
  return exists ? value : null;
}

/**
 * Effective community for admin API calls and pages.
 *
 * Non-superadmins MUST use session.communityId (JWT), not el_active_community.
 * The cookie is client-writable (httpOnly:false) — honoring it whenever the user
 * has any UserCommunity membership lets club staff keep a privileged JWT role
 * from community A while scoping reports/amenities/tournaments/POS to community B.
 * Only platform super-admins may select tenant via the active-community cookie.
 */
export async function resolveScopedCommunityId(
  session: SessionPayload,
): Promise<string> {
  if (isSuperAdmin(session)) {
    const active = await getActiveCommunityCookie();
    if (active) return active;
  }
  if (session.communityId) return session.communityId;
  const first = await prisma.community.findFirst({
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return first?.id ?? DEFAULT_COMMUNITY;
}

export async function getActiveCommunityId(
  session: SessionPayload,
): Promise<string | null> {
  if (isSuperAdmin(session)) {
    const active = await getActiveCommunityCookie();
    if (active) return active;
  }
  if (session.communityId) return session.communityId;
  return null;
}

export function canManageCommunity(
  session: SessionPayload,
  communityId: string,
): boolean {
  if (isSuperAdmin(session)) return true;
  return session.communityId === communityId;
}

/** Super admin, club admin, or PM/front desk can book amenities for members. */
export function canStaffBookForMembers(session: SessionPayload): boolean {
  return session.role === "admin" || session.role === "pm";
}

/** Staff may create amenity bookings in this community. */
export function canStaffBookInCommunity(
  session: SessionPayload,
  communityId: string,
): boolean {
  if (!canStaffBookForMembers(session)) return false;
  if (isSuperAdmin(session)) return true;
  return session.communityId === communityId;
}
