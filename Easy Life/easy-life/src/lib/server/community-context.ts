import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/tenant";
import { getActiveMembershipRole } from "@/lib/server/memberships";
import { canUseActiveCommunityCookie } from "@/lib/server/community-scope";

export { ACTIVE_COMMUNITY_COOKIE };
export { canUseActiveCommunityCookie } from "@/lib/server/community-scope";
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

async function communityIdFromActiveCookie(
  session: SessionPayload,
): Promise<string | null> {
  const active = await getActiveCommunityCookie();
  if (!active) return null;
  if (isSuperAdmin(session)) return active;
  if (!session.sub) return null;
  const membershipRole = await getActiveMembershipRole(session.sub, active);
  if (
    canUseActiveCommunityCookie({
      sessionRole: session.role,
      membershipRole,
    })
  ) {
    return active;
  }
  return null;
}

/** Effective community for admin API calls and pages. */
export async function resolveScopedCommunityId(
  session: SessionPayload,
): Promise<string> {
  const fromCookie = await communityIdFromActiveCookie(session);
  if (fromCookie) return fromCookie;
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
  const fromCookie = await communityIdFromActiveCookie(session);
  if (fromCookie) return fromCookie;
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
