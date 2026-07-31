import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";
import { shouldBlockSessionForStaging } from "@/lib/server/staging-policy";

export async function isCommunityStaging(communityId: string | null): Promise<boolean> {
  if (!communityId) return false;
  const row = await prisma.community.findUnique({
    where: { id: communityId },
    select: { stagingMode: true },
  });
  return row?.stagingMode ?? false;
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
