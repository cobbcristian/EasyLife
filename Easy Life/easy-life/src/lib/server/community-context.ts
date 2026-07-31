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

/** Effective community for admin API calls and pages. */
export async function resolveScopedCommunityId(
  session: SessionPayload,
): Promise<string> {
  if (session.communityId) return session.communityId;
  const active = await getActiveCommunityCookie();
  if (active) return active;
  const first = await prisma.community.findFirst({
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return first?.id ?? DEFAULT_COMMUNITY;
}

export async function getActiveCommunityId(
  session: SessionPayload,
): Promise<string | null> {
  if (session.communityId) return session.communityId;
  return getActiveCommunityCookie();
}

export function canManageCommunity(
  session: SessionPayload,
  communityId: string,
): boolean {
  if (isSuperAdmin(session)) return true;
  return session.communityId === communityId;
}
