import { diningProviderEmail } from "@/lib/server/dining";
import { prisma } from "@/lib/server/prisma";

/**
 * Resolve which dining provider email may receive a POS menu sync for this club.
 * Never trusts a client-supplied email that is not tied to the club.
 */
export async function resolvePosSyncProviderEmail(input: {
  communityId: string;
  requestedEmail?: string | null;
}): Promise<string | null> {
  const communityId = input.communityId.trim();
  if (!communityId || communityId === "__missing_community__") return null;

  const requested = input.requestedEmail?.trim().toLowerCase() || null;
  if (requested) {
    const inClub = await prisma.user.findFirst({
      where: {
        email: requested,
        role: "provider",
        communityId,
      },
      select: { email: true },
    });
    if (inClub?.email) return inClub.email.toLowerCase();

    const providerRow = await prisma.provider.findFirst({
      where: {
        communityId,
        email: requested,
      },
      select: { email: true },
    });
    if (providerRow?.email) return providerRow.email.trim().toLowerCase();

    // Explicit request that does not belong to this club — refuse (no cross-tenant write).
    return null;
  }

  const restaurant = await prisma.provider.findFirst({
    where: { communityId, category: { contains: "Restaurant" } },
    select: { email: true },
  });
  if (restaurant?.email?.trim()) return restaurant.email.trim().toLowerCase();

  const anyProviderUser = await prisma.user.findFirst({
    where: { role: "provider", communityId },
    select: { email: true },
  });
  if (anyProviderUser?.email) return anyProviderUser.email.toLowerCase();

  const dining = diningProviderEmail(communityId);
  return dining || null;
}
