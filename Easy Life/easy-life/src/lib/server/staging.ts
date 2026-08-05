import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";
import { shouldBlockSessionForStaging } from "@/lib/server/staging-policy";

const stagingCache = new Map<string, { staging: boolean; at: number }>();
const STAGING_TTL_MS = 60_000;

export async function isCommunityStaging(communityId: string | null): Promise<boolean> {
  if (!communityId) return false;
  const hit = stagingCache.get(communityId);
  if (hit && Date.now() - hit.at < STAGING_TTL_MS) return hit.staging;

  const row = await prisma.community.findUnique({
    where: { id: communityId },
    select: { stagingMode: true },
  });
  const staging = row?.stagingMode ?? false;
  stagingCache.set(communityId, { staging, at: Date.now() });
  return staging;
}

/** Admins can always access; other roles blocked when club is in staging. */
export async function isSessionBlockedByStaging(session: SessionPayload): Promise<boolean> {
  if (!session.communityId) return false;
  const staging = await isCommunityStaging(session.communityId);
  return shouldBlockSessionForStaging(session.role, session.communityId, staging);
}

export async function getStagingCommunityInfo(communityId: string) {
  return prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, appDisplayName: true, stagingMode: true },
  });
}
