import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/tenant";
import { userHasActiveMembership } from "@/lib/server/memberships";

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

/** Effective community for admin API calls and pages. */
export async function resolveScopedCommunityId(
  session: SessionPayload,
): Promise<string> {
  const active = await getActiveCommunityCookie();
  if (active) {
    if (isSuperAdmin(session)) return active;
    if (session.sub && (await userHasActiveMembership(session.sub, active))) {
      return active;
    }
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
  const active = await getActiveCommunityCookie();
  if (active) {
    if (isSuperAdmin(session)) return active;
    if (session.sub && (await userHasActiveMembership(session.sub, active))) {
      return active;
    }
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
