import { prisma } from "@/lib/server/prisma";
import {
  normalizeMembershipTier,
  periodBounds,
  resolveTierDefinition,
  tierAllowsAmenity,
  tierDefinitionsForCommunity,
  type MembershipTierSlug,
} from "@/lib/membership-tiers";
import {
  evaluateRejoinEligibility,
  rejoinWaitMessage,
} from "@/lib/membership-rejoin";

export class MembershipAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipAccessError";
  }
}

export async function ensureMembershipTiersSeeded(communityId: string) {
  const defs = tierDefinitionsForCommunity(communityId);
  const existing = await prisma.membershipTierConfig.findMany({
    where: { communityId },
    select: { slug: true, accessKindsJson: true, fbMinimumAmount: true },
  });
  const have = new Map(
    existing.map((r) => [
      r.slug,
      { access: r.accessKindsJson, fb: r.fbMinimumAmount },
    ]),
  );
  const missing = Object.entries(defs).filter(([slug]) => !have.has(slug));

  if (missing.length > 0) {
    await prisma.membershipTierConfig.createMany({
      data: missing.map(([slug, def]) => ({
        communityId,
        slug,
        name: def.name,
        accessKindsJson: JSON.stringify(def.accessKinds),
        fbMinimumAmount: def.fbMinimumAmount,
        fbMinimumPeriod: def.fbMinimumPeriod,
      })),
    });
  }

  for (const [slug, def] of Object.entries(defs)) {
    const row = have.get(slug);
    if (!row) continue;
    const nextAccess = JSON.stringify(def.accessKinds);
    if (row.access === nextAccess && row.fb === def.fbMinimumAmount) continue;
    await prisma.membershipTierConfig.update({
      where: { communityId_slug: { communityId, slug } },
      data: {
        name: def.name,
        accessKindsJson: nextAccess,
        fbMinimumAmount: def.fbMinimumAmount,
        fbMinimumPeriod: def.fbMinimumPeriod,
      },
    });
  }
}

export async function getMemberTierSlug(email: string): Promise<MembershipTierSlug> {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email.toLowerCase() },
    select: { membershipTier: true },
  });
  return normalizeMembershipTier(profile?.membershipTier);
}

export async function getTierConfig(communityId: string, slug: string) {
  await ensureMembershipTiersSeeded(communityId);
  const row = await prisma.membershipTierConfig.findUnique({
    where: { communityId_slug: { communityId, slug } },
  });
  if (row) {
    return {
      ...row,
      accessKinds: JSON.parse(row.accessKindsJson) as string[],
    };
  }
  const def = resolveTierDefinition(slug, communityId);
  return {
    communityId,
    slug: normalizeMembershipTier(slug),
    name: def.name,
    accessKinds: def.accessKinds as string[],
    fbMinimumAmount: def.fbMinimumAmount,
    fbMinimumPeriod: def.fbMinimumPeriod,
  };
}

export async function assertCanBookAmenity(input: {
  communityId: string;
  memberEmail: string;
  amenityKind: string;
  amenityName: string;
}) {
  const email = input.memberEmail.toLowerCase();
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
    select: {
      membershipStatus: true,
      resignedAt: true,
      rejoinEligibleOn: true,
    },
  });
  if (profile?.membershipStatus === "resigned") {
    const policy = await prisma.membershipRejoinPolicy.findUnique({
      where: { communityId: input.communityId },
    });
    const enabled = policy?.enabled ?? true;
    const waitDays = policy?.waitDays ?? 365;
    const evalResult = evaluateRejoinEligibility({
      policyEnabled: enabled,
      waitDays,
      resignedAt: profile.resignedAt,
      rejoinEligibleOn: profile.rejoinEligibleOn,
    });
    throw new MembershipAccessError(
      rejoinWaitMessage({
        memberName: "You",
        waitDays,
        daysRemaining: evalResult.daysRemaining,
        eligibleOn: evalResult.eligibleOn,
      }),
    );
  }

  const tier = await getMemberTierSlug(input.memberEmail);
  const config = await getTierConfig(input.communityId, tier);
  if (
    !tierAllowsAmenity(tier, input.amenityKind, input.amenityName, config.accessKinds)
  ) {
    throw new MembershipAccessError(
      `Your ${config.name} membership cannot book ${input.amenityName}. Upgrade your membership for access.`,
    );
  }
}

export async function getOrCreateFbPeriod(input: {
  communityId: string;
  memberEmail: string;
}) {
  const tier = await getMemberTierSlug(input.memberEmail);
  const config = await getTierConfig(input.communityId, tier);
  const periodKind = config.fbMinimumPeriod as
    | "monthly"
    | "quarterly"
    | "semi_annual"
    | "annual";
  const { start, end } = periodBounds(periodKind);
  const email = input.memberEmail.toLowerCase();

  return prisma.memberFbPeriod.upsert({
    where: {
      communityId_memberEmail_periodStart: {
        communityId: input.communityId,
        memberEmail: email,
        periodStart: start,
      },
    },
    create: {
      communityId: input.communityId,
      memberEmail: email,
      periodStart: start,
      periodEnd: end,
      periodKind,
      requiredAmount: config.fbMinimumAmount,
      spentAmount: 0,
      status: config.fbMinimumAmount <= 0 ? "met" : "open",
    },
    update: {
      requiredAmount: config.fbMinimumAmount,
      periodEnd: end,
      periodKind,
    },
  });
}

export async function recordFbSpend(input: {
  communityId: string;
  memberEmail: string;
  amount: number;
}) {
  if (input.amount <= 0) return null;
  const period = await getOrCreateFbPeriod(input);
  const spentAmount = period.spentAmount + input.amount;
  const status =
    spentAmount >= period.requiredAmount
      ? "met"
      : period.status === "shortfall_charged"
        ? "shortfall_charged"
        : "open";
  return prisma.memberFbPeriod.update({
    where: { id: period.id },
    data: { spentAmount, status },
  });
}

export async function listMembershipTiers(communityId: string) {
  await ensureMembershipTiersSeeded(communityId);
  const rows = await prisma.membershipTierConfig.findMany({
    where: { communityId },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    accessKinds: JSON.parse(r.accessKindsJson) as string[],
  }));
}
