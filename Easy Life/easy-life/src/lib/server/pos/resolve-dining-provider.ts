import { diningProviderEmail } from "@/lib/server/dining";
import { prisma } from "@/lib/server/prisma";

/**
 * Resolve the dining/POS menu owner for a club.
 * Never trust a client-supplied providerEmail — that enables cross-tenant menu writes.
 */
export async function resolveCommunityDiningProviderEmail(
  communityId: string,
): Promise<string | null> {
  const restaurant = await prisma.provider.findFirst({
    where: { communityId, category: { contains: "Restaurant" } },
    select: { email: true },
  });
  const restaurantEmail = restaurant?.email?.trim().toLowerCase();
  if (restaurantEmail) return restaurantEmail;

  const providerUser = await prisma.user.findFirst({
    where: { role: "provider", communityId },
    select: { email: true },
  });
  if (providerUser?.email) return providerUser.email.toLowerCase();

  const mapped = diningProviderEmail(communityId).trim().toLowerCase();
  return mapped || null;
}
