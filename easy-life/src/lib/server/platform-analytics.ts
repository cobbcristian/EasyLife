import { prisma } from "@/lib/server/prisma";

export interface PlatformOverview {
  totalCommunities: number;
  totalMembers: number;
  totalProviders: number;
  openHelpTickets: number;
  pendingReminders: number;
  communities: Array<{
    id: string;
    name: string;
    residentCount: number;
    memberCount: number;
    stagingMode: boolean;
    customDomain: string | null;
    createdAt: string;
  }>;
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const [communities, memberCount, providerCount, openTickets, pendingReminders] =
    await Promise.all([
      prisma.community.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          residentCount: true,
          stagingMode: true,
          customDomain: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { role: "member" } }),
      prisma.provider.count(),
      prisma.helpTicket.count({ where: { status: { not: "resolved" } } }),
      prisma.scheduledNotification.count({ where: { sent: false } }),
    ]);

  const memberCounts = await prisma.user.groupBy({
    by: ["communityId"],
    where: { role: "member", communityId: { not: null } },
    _count: { _all: true },
  });
  const countByCommunity = new Map(
    memberCounts.map((r) => [r.communityId!, r._count._all]),
  );

  return {
    totalCommunities: communities.length,
    totalMembers: memberCount,
    totalProviders: providerCount,
    openHelpTickets: openTickets,
    pendingReminders,
    communities: communities.map((c) => ({
      id: c.id,
      name: c.name,
      residentCount: c.residentCount,
      memberCount: countByCommunity.get(c.id) ?? 0,
      stagingMode: c.stagingMode,
      customDomain: c.customDomain,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export interface OnboardingReadiness {
  percent: number;
  checks: Array<{ id: string; label: string; done: boolean }>;
}

export async function getCommunityOnboardingReadiness(
  communityId: string,
): Promise<OnboardingReadiness> {
  const [community, amenities, documents, providers, members, stripeOk] =
    await Promise.all([
      prisma.community.findUnique({
        where: { id: communityId },
        select: { logoUrl: true, primaryColor: true, inviteCode: true, customDomain: true },
      }),
      prisma.amenity.count({ where: { communityId } }),
      prisma.communityDocument.count({ where: { communityId } }),
      prisma.provider.count({ where: { communityId } }),
      prisma.user.count({ where: { communityId, role: "member" } }),
      Promise.resolve(Boolean(process.env.STRIPE_SECRET_KEY)),
    ]);

  const checks = [
    { id: "branding", label: "Branding configured", done: Boolean(community?.logoUrl || community?.primaryColor) },
    { id: "invite", label: "Invite code set", done: Boolean(community?.inviteCode) },
    { id: "members", label: "Members imported", done: members >= 1 },
    { id: "amenities", label: "Amenities added", done: amenities >= 1 },
    { id: "documents", label: "Documents uploaded", done: documents >= 1 },
    { id: "providers", label: "Providers added", done: providers >= 1 },
    { id: "payments", label: "Stripe configured", done: stripeOk },
    { id: "domain", label: "Custom domain set", done: Boolean(community?.customDomain) },
  ];

  const done = checks.filter((c) => c.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    checks,
  };
}
