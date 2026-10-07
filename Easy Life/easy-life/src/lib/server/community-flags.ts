import { communityHasTournaments } from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";

/** Resident-facing tournaments flag, including a property-manager override. */
export async function tournamentsEnabledFor(
  communityId: string | null | undefined,
): Promise<boolean> {
  if (!communityId) return communityHasTournaments(communityId);
  const row = await prisma.community.findUnique({
    where: { id: communityId },
    select: { tournamentsEnabled: true },
  });
  return communityHasTournaments(communityId, row?.tournamentsEnabled ?? null);
}
