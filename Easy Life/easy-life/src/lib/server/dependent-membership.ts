import { prisma } from "@/lib/server/prisma";
import { addMemberInboxItem } from "@/lib/server/project-management";
import {
  evaluateDependentEligibility,
  isDependentInCommunityScope,
  noticeMessage,
  type DependentNoticeLevel,
} from "@/lib/dependent-membership";

const DEFAULT_AGE_OUT = 25;
const DEFAULT_WARN_DAYS = 90;

export async function ensureDependentPolicy(communityId: string) {
  return prisma.dependentMembershipPolicy.upsert({
    where: { communityId },
    create: {
      communityId,
      ageOutYears: DEFAULT_AGE_OUT,
      warnDaysBefore: DEFAULT_WARN_DAYS,
      requireSameAddress: true,
      actionOnBreach: "force_convert",
      notes:
        "Dependents must obtain their own membership at age 25, or sooner if they no longer share the sponsor’s address.",
    },
    update: {},
  });
}

export async function listHouseholdDependents(sponsorEmail: string) {
  return prisma.memberProfileExt.findMany({
    where: {
      sponsorEmail: sponsorEmail.toLowerCase(),
      householdRole: { in: ["dependent", "former_dependent"] },
    },
    orderBy: { userEmail: "asc" },
  });
}

export async function getHouseholdSnapshot(userEmail: string) {
  const email = userEmail.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { communityId: true },
  });
  const communityId = user?.communityId;
  if (!communityId) {
    return {
      policy: null,
      viewerEmail: email,
      sponsor: null,
      me: null,
      dependents: [],
      notices: [],
    };
  }
  const policy = await ensureDependentPolicy(communityId);
  const me = await prisma.memberProfileExt.findUnique({ where: { userEmail: email } });

  const sponsorEmail =
    me?.householdRole === "dependent" || me?.householdRole === "former_dependent"
      ? (me.sponsorEmail ?? email)
      : email;

  const [sponsorProfile, dependents, notices] = await Promise.all([
    prisma.memberProfileExt.findUnique({ where: { userEmail: sponsorEmail } }),
    listHouseholdDependents(sponsorEmail),
    prisma.dependentMembershipNotice.findMany({
      where: {
        OR: [{ sponsorEmail }, { dependentEmail: email }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const emails = Array.from(
    new Set([sponsorEmail, ...dependents.map((d) => d.userEmail.toLowerCase())]),
  );
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true },
  });
  const nameByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.name]));

  const dependentRows = dependents.map((dep) => {
    const evalResult = evaluateDependentEligibility({
      dateOfBirth: dep.dateOfBirth,
      householdAddress: dep.householdAddress ?? dep.unit,
      sponsorAddress: sponsorProfile?.householdAddress ?? sponsorProfile?.unit,
      ageOutYears: policy.ageOutYears,
      requireSameAddress: policy.requireSameAddress,
      warnDaysBefore: policy.warnDaysBefore,
    });
    return {
      email: dep.userEmail,
      name: nameByEmail.get(dep.userEmail.toLowerCase()) ?? dep.userEmail,
      dateOfBirth: dep.dateOfBirth,
      householdAddress: dep.householdAddress ?? dep.unit,
      status: dep.dependentStatus,
      dueDate: dep.dependentDueDate ?? evalResult.ageOutDate,
      age: evalResult.age,
      daysUntilAgeOut: evalResult.daysUntilAgeOut,
      addressOk: evalResult.addressOk,
      reason: evalResult.reason,
      suggestedStatus: evalResult.suggestedStatus,
    };
  });

  return {
    policy: {
      ageOutYears: policy.ageOutYears,
      warnDaysBefore: policy.warnDaysBefore,
      requireSameAddress: policy.requireSameAddress,
      actionOnBreach: policy.actionOnBreach,
      notes: policy.notes,
    },
    viewerEmail: email,
    sponsor: {
      email: sponsorEmail,
      name: nameByEmail.get(sponsorEmail) ?? sponsorEmail,
      address: sponsorProfile?.householdAddress ?? sponsorProfile?.unit ?? null,
      role: sponsorProfile?.householdRole ?? "owner",
    },
    me: me
      ? {
          role: me.householdRole,
          dateOfBirth: me.dateOfBirth,
          status: me.dependentStatus,
          dueDate: me.dependentDueDate,
          address: me.householdAddress ?? me.unit,
          sponsorEmail: me.sponsorEmail,
        }
      : null,
    dependents: dependentRows,
    notices: notices.map((n) => ({
      id: n.id,
      level: n.level,
      reason: n.reason,
      message: n.message,
      dueDate: n.dueDate,
      createdAt: n.createdAt.toISOString(),
      forDependent: n.dependentEmail,
    })),
  };
}

async function createNoticeIfNew(input: {
  communityId: string;
  dependentEmail: string;
  sponsorEmail: string;
  reason: string;
  level: DependentNoticeLevel;
  message: string;
  dueDate?: string | null;
}) {
  const recent = await prisma.dependentMembershipNotice.findFirst({
    where: {
      dependentEmail: input.dependentEmail,
      level: input.level,
      reason: input.reason,
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return null;

  const notice = await prisma.dependentMembershipNotice.create({
    data: {
      communityId: input.communityId,
      dependentEmail: input.dependentEmail,
      sponsorEmail: input.sponsorEmail,
      reason: input.reason,
      level: input.level,
      message: input.message,
      dueDate: input.dueDate ?? null,
    },
  });

  await addMemberInboxItem({
    userEmail: input.sponsorEmail,
    title: "Dependent membership notice",
    body: input.message,
    href: "/member/household",
  });
  await addMemberInboxItem({
    userEmail: input.dependentEmail,
    title: "Your club membership status",
    body: input.message,
    href: "/member/household",
  });

  return notice;
}

/** Scan dependents and apply warnings / conversion requirements. */

/** Active / primary accounts for a club (cached communityId or memberships). */
async function listCommunityMemberEmails(communityId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { communityId },
        { memberships: { some: { communityId, status: "active" } } },
      ],
    },
    select: { email: true },
  });
  return users.map((u) => u.email.toLowerCase());
}

export async function processDependentMembershipAging(
  communityId?: string,
): Promise<number> {
  const cid = communityId?.trim();
  if (!cid) {
    const clubs = await prisma.user.findMany({
      where: { communityId: { not: null } },
      select: { communityId: true },
      distinct: ["communityId"],
    });
    let total = 0;
    for (const row of clubs) {
      if (!row.communityId) continue;
      total += await processDependentMembershipAging(row.communityId);
    }
    return total;
  }

  const policy = await ensureDependentPolicy(cid);
  if (!policy.active) return 0;

  const memberEmails = await listCommunityMemberEmails(cid);
  if (memberEmails.length === 0) return 0;
  const memberEmailSet = new Set(memberEmails);

  const dependents = await prisma.memberProfileExt.findMany({
    where: {
      householdRole: "dependent",
      dependentStatus: { not: "terminated" },
      userEmail: { in: memberEmails },
    },
  });

  let updated = 0;
  for (const dep of dependents) {
    if (!isDependentInCommunityScope(dep.userEmail, memberEmailSet)) continue;
    if (!dep.sponsorEmail) continue;
    const sponsor = await prisma.memberProfileExt.findUnique({
      where: { userEmail: dep.sponsorEmail.toLowerCase() },
    });
    const evalResult = evaluateDependentEligibility({
      dateOfBirth: dep.dateOfBirth,
      householdAddress: dep.householdAddress ?? dep.unit,
      sponsorAddress: sponsor?.householdAddress ?? sponsor?.unit,
      ageOutYears: policy.ageOutYears,
      requireSameAddress: policy.requireSameAddress,
      warnDaysBefore: policy.warnDaysBefore,
    });

    if (evalResult.reason === "none" && evalResult.suggestedStatus === "active") {
      if (dep.dependentStatus !== "active") {
        await prisma.memberProfileExt.update({
          where: { userEmail: dep.userEmail },
          data: {
            dependentStatus: "active",
            dependentDueDate: evalResult.ageOutDate,
          },
        });
        updated++;
      }
      continue;
    }

    const user = await prisma.user.findUnique({ where: { email: dep.userEmail } });
    const dependentName = user?.name ?? dep.userEmail;
    const dueDate = evalResult.ageOutDate;
    let nextStatus = evalResult.suggestedStatus;
    let level: DependentNoticeLevel = "warning";

    if (evalResult.pastDue) {
      nextStatus =
        policy.actionOnBreach === "terminate" ? "terminated" : "must_convert";
      level = nextStatus === "terminated" ? "terminated" : "must_convert";
    } else if (
      evalResult.daysUntilAgeOut != null &&
      evalResult.daysUntilAgeOut <= 30
    ) {
      level = "final_warning";
      nextStatus = "warned";
    } else {
      level = "warning";
      nextStatus = "warned";
    }

    await prisma.memberProfileExt.update({
      where: { userEmail: dep.userEmail },
      data: {
        dependentStatus: nextStatus,
        dependentWarnedAt: new Date(),
        dependentDueDate: dueDate,
        householdRole: nextStatus === "terminated" ? "former_dependent" : "dependent",
      },
    });

    await createNoticeIfNew({
      communityId: cid,
      dependentEmail: dep.userEmail,
      sponsorEmail: dep.sponsorEmail,
      reason: evalResult.reason === "none" ? "age" : evalResult.reason,
      level,
      dueDate,
      message: noticeMessage({
        dependentName,
        ageOutYears: policy.ageOutYears,
        reason: evalResult.reason === "none" ? "age" : evalResult.reason,
        level,
        dueDate,
        daysLeft: evalResult.daysUntilAgeOut,
      }),
    });
    updated++;
  }

  return updated;
}

export async function ensureDemoDependents(communityId: string) {
  // Sarah / Unit 204B / Golden Ocala address — never plant into other clubs.
  if (communityId !== "golden-ocala") return;

  await ensureDependentPolicy(communityId);

  // Adult child nearing age-out (turns 25 within ~warn window depending on DOB)
  const sponsorEmail = "sarah.mitchell@oceanside.com";
  const dependentEmail = "alex.mitchell@oceanside.com";

  const sponsor = await prisma.user.findUnique({ where: { email: sponsorEmail } });
  if (!sponsor) return;

  await prisma.user.upsert({
    where: { email: dependentEmail },
    create: {
      email: dependentEmail,
      password: sponsor.password,
      role: "member",
      name: "Alex Mitchell",
      communityId,
    },
    update: { name: "Alex Mitchell", communityId },
  });

  const today = new Date();
  // Age 24 years + (365 - 60) days approx → warn window with 90-day default
  const dob = new Date(today);
  dob.setFullYear(dob.getFullYear() - 24);
  dob.setDate(dob.getDate() - (365 - 60)); // ~60 days until 25th birthday
  const dobStr = dob.toISOString().slice(0, 10);

  await prisma.memberProfileExt.upsert({
    where: { userEmail: sponsorEmail },
    create: {
      userEmail: sponsorEmail,
      unit: "204B",
      householdAddress: "204B Magnolia Lane, Golden Ocala",
      householdRole: "owner",
      membershipTier: "national",
      residencyStatus: "resident",
      paysHoa: true,
    },
    update: {
      householdAddress: "204B Magnolia Lane, Golden Ocala",
      unit: "204B",
    },
  });

  await prisma.memberProfileExt.upsert({
    where: { userEmail: dependentEmail },
    create: {
      userEmail: dependentEmail,
      unit: "204B",
      householdAddress: "204B Magnolia Lane, Golden Ocala",
      householdRole: "dependent",
      sponsorEmail,
      dateOfBirth: dobStr,
      membershipTier: "national",
      residencyStatus: "resident",
      paysHoa: false,
      dependentStatus: "active",
    },
    update: {
      householdRole: "dependent",
      sponsorEmail,
      dateOfBirth: dobStr,
      householdAddress: "204B Magnolia Lane, Golden Ocala",
    },
  });
}
