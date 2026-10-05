import { prisma } from "@/lib/server/prisma";

/**
 * Prisma `where` for the Provider row owned by the signed-in account.
 * Match by community + email only — never by display name.
 * Duplicate business names in a club would otherwise attach credentials or
 * mutate another provider's profile (findFirst OR name is nondeterministic).
 */
export function providerWhereForSession(input: {
  communityId: string;
  email: string;
}): { communityId: string; email: string } {
  return {
    communityId: input.communityId,
    email: input.email.trim().toLowerCase(),
  };
}

export async function findProviderForSession(input: {
  communityId: string;
  email: string;
}) {
  return prisma.provider.findFirst({
    where: providerWhereForSession(input),
  });
}
