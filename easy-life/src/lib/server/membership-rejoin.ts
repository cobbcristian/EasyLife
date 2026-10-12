import { prisma } from "@/lib/server/prisma";
import { addMemberInboxItem } from "@/lib/server/project-management";
import { listClubStaff } from "@/lib/server/residency";
import {
  addDaysIso,
  evaluateRejoinEligibility,
  rejoinWaitMessage,
} from "@/lib/membership-rejoin";
import { MembershipAccessError } from "@/lib/server/membership";
import {
  MEMBERSHIP_NOT_RENEWED_MESSAGE,
  isMembershipDeactivated,
} from "@/lib/membership-status";

const DEFAULT_WAIT_DAYS = 365;

export async function ensureRejoinPolicy(communityId: string) {
  return prisma.membershipRejoinPolicy.upsert({
    where: { communityId },
    create: {
      communityId,
      enabled: true,
      waitDays: DEFAULT_WAIT_DAYS,
      memberRemindDaysBefore: 14,
      staffRemindDaysBefore: 30,
      notes: "Members who resign may not rejoin for one year. Clubs can turn this off or change the wait.",
    },
    update: {},
  });
}

export async function updateRejoinPolicy(
  communityId: string,
  patch: {
    enabled?: boolean;
    waitDays?: number;
    memberRemindDaysBefore?: number;
    staffRemindDaysBefore?: number;
    notes?: string;
  },
) {
  await ensureRejoinPolicy(communityId);
  return prisma.membershipRejoinPolicy.update({
    where: { communityId },
    data: {
      ...(typeof patch.enabled === "boolean" ? { enabled: patch.enabled } : {}),
      ...(typeof patch.waitDays === "number" && patch.waitDays > 0
        ? { waitDays: Math.floor(patch.waitDays) }
        : {}),
      ...(typeof patch.memberRemindDaysBefore === "number" && patch.memberRemindDaysBefore >= 0
        ? { memberRemindDaysBefore: Math.floor(patch.memberRemindDaysBefore) }
        : {}),
      ...(typeof patch.staffRemindDaysBefore === "number" && patch.staffRemindDaysBefore >= 0
        ? { staffRemindDaysBefore: Math.floor(patch.staffRemindDaysBefore) }
        : {}),
      ...(typeof patch.notes === "string" ? { notes: patch.notes } : {}),
    },
  });
}

async function createNoticeIfNew(input: {
  communityId: string;
  userEmail: string;
  audience: "staff" | "member";
  level: string;
  message: string;
  daysRemaining?: number | null;
}) {
  const recent = await prisma.membershipRejoinNotice.findFirst({
    where: {
      userEmail: input.userEmail,
      audience: input.audience,
      level: input.level,
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return null;

  const notice = await prisma.membershipRejoinNotice.create({
    data: {
      communityId: input.communityId,
      userEmail: input.userEmail,
      audience: input.audience,
      level: input.level,
      message: input.message,
      daysRemaining: input.daysRemaining ?? null,
    },
  });

  await addMemberInboxItem({
    userEmail: input.userEmail,
    title:
      input.audience === "staff"
        ? "Membership rejoin wait"
        : "Membership status",
    body: input.message,
    href: "/member/membership",
  });

  return notice;
}

async function notifyMembershipStaff(
  communityId: string,
  message: string,
  level: string,
  daysRemaining?: number | null,
) {
  const staff = await listClubStaff(communityId);
  const targets = staff.filter(
    (s) =>
      s.email &&
      (s.category === "management" || s.category === "front_desk"),
  );
  for (const s of targets) {
    if (!s.email) continue;
    await createNoticeIfNew({
      communityId,
      userEmail: s.email.toLowerCase(),
      audience: "staff",
      level,
      message,
      daysRemaining,
    });
  }

  // Also ping club admin users so someone always sees waitlist alerts.
  const admins = await prisma.user.findMany({
    where: { communityId, role: "admin" },
    select: { email: true },
  });
  for (const a of admins) {
    await createNoticeIfNew({
      communityId,
      userEmail: a.email.toLowerCase(),
      audience: "staff",
      level,
      message,
      daysRemaining,
    });
  }
}

export async function assertMembershipActive(memberEmail: string) {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: memberEmail.toLowerCase() },
    select: { membershipStatus: true, rejoinEligibleOn: true, resignedAt: true },
  });
  if (isMembershipDeactivated(profile?.membershipStatus)) {
    throw new MembershipAccessError(MEMBERSHIP_NOT_RENEWED_MESSAGE);
  }
  if (profile?.membershipStatus === "resigned") {
    const user = await prisma.user.findUnique({
      where: { email: memberEmail.toLowerCase() },
      select: { communityId: true },
    });
    const policy = await ensureRejoinPolicy(
      user?.communityId?.trim() || "__missing_community__",
    );
    const evalResult = evaluateRejoinEligibility({
      policyEnabled: policy.enabled,
      waitDays: policy.waitDays,
      resignedAt: profile.resignedAt,
      rejoinEligibleOn: profile.rejoinEligibleOn,
    });
    throw new MembershipAccessError(
      rejoinWaitMessage({
        memberName: "You",
        waitDays: policy.waitDays,
        daysRemaining: evalResult.daysRemaining,
        eligibleOn: evalResult.eligibleOn,
      }),
    );
  }
}

export async function resignMembership(input: {
  communityId?: string;
  userEmail: string;
  reason?: string;
}) {
  const communityId = input.communityId?.trim() || "__missing_community__";
  const email = input.userEmail.toLowerCase();
  const policy = await ensureRejoinPolicy(communityId);
  const now = new Date();
  const eligibleOn = policy.enabled
    ? addDaysIso(now, policy.waitDays)
    : null;

  await prisma.memberProfileExt.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      membershipStatus: "resigned",
      resignedAt: now,
      rejoinEligibleOn: eligibleOn,
    },
    update: {
      membershipStatus: "resigned",
      resignedAt: now,
      rejoinEligibleOn: eligibleOn,
    },
  });

  await prisma.membershipResignation.create({
    data: {
      communityId,
      userEmail: email,
      resignedAt: now,
      rejoinEligibleOn: eligibleOn,
      reason: input.reason?.trim() ?? "",
      status: "open",
    },
  });

  const user = await prisma.user.findUnique({ where: { email } });
  const name = user?.name ?? email;
  const memberMsg = rejoinWaitMessage({
    memberName: name,
    waitDays: policy.waitDays,
    daysRemaining: policy.enabled ? policy.waitDays : null,
    eligibleOn,
  });
  await createNoticeIfNew({
    communityId,
    userEmail: email,
    audience: "member",
    level: "waiting",
    message: memberMsg,
    daysRemaining: policy.enabled ? policy.waitDays : null,
  });

  if (policy.enabled) {
    await notifyMembershipStaff(
      communityId,
      rejoinWaitMessage({
        memberName: name,
        waitDays: policy.waitDays,
        daysRemaining: policy.waitDays,
        eligibleOn,
        forStaff: true,
      }),
      "waiting",
      policy.waitDays,
    );
  }

  return { eligibleOn, waitDays: policy.waitDays, enabled: policy.enabled };
}

export async function requestRejoin(input: {
  communityId?: string;
  userEmail: string;
}) {
  const communityId = input.communityId?.trim() || "__missing_community__";
  const email = input.userEmail.toLowerCase();
  const policy = await ensureRejoinPolicy(communityId);
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
  });
  if (!profile || profile.membershipStatus !== "resigned") {
    return { ok: false as const, error: "Membership is not resigned." };
  }

  const evalResult = evaluateRejoinEligibility({
    policyEnabled: policy.enabled,
    waitDays: policy.waitDays,
    resignedAt: profile.resignedAt,
    rejoinEligibleOn: profile.rejoinEligibleOn,
  });

  if (!evalResult.eligible) {
    const user = await prisma.user.findUnique({ where: { email } });
    const msg = rejoinWaitMessage({
      memberName: user?.name ?? email,
      waitDays: policy.waitDays,
      daysRemaining: evalResult.daysRemaining,
      eligibleOn: evalResult.eligibleOn,
      forStaff: true,
    });
    await notifyMembershipStaff(
      communityId,
      `Rejoin attempt blocked: ${msg}`,
      "blocked_attempt",
      evalResult.daysRemaining,
    );
    await createNoticeIfNew({
      communityId,
      userEmail: email,
      audience: "member",
      level: "blocked_attempt",
      message: rejoinWaitMessage({
        memberName: "You",
        waitDays: policy.waitDays,
        daysRemaining: evalResult.daysRemaining,
        eligibleOn: evalResult.eligibleOn,
      }),
      daysRemaining: evalResult.daysRemaining,
    });
    return {
      ok: false as const,
      error: "Still in rejoin waiting period.",
      daysRemaining: evalResult.daysRemaining,
      eligibleOn: evalResult.eligibleOn,
    };
  }

  await prisma.memberProfileExt.update({
    where: { userEmail: email },
    data: {
      membershipStatus: "active",
      resignedAt: null,
      rejoinEligibleOn: null,
    },
  });
  await prisma.membershipResignation.updateMany({
    where: { userEmail: email, status: "open" },
    data: { status: "reinstated", reinstatedAt: new Date() },
  });

  await createNoticeIfNew({
    communityId,
    userEmail: email,
    audience: "member",
    level: "eligible",
    message: "Your membership has been reinstated. Welcome back.",
    daysRemaining: 0,
  });
  await notifyMembershipStaff(
    communityId,
    `${email} has been reinstated after completing the rejoin wait.`,
    "eligible",
    0,
  );

  return { ok: true as const };
}

export async function listWaitingRejoins(communityId = "__missing_community__") {
  const policy = await ensureRejoinPolicy(communityId);
  const communityUsers = await prisma.user.findMany({
    where: { communityId, role: "member" },
    select: { email: true, name: true },
  });
  const emailSet = new Set(communityUsers.map((u) => u.email.toLowerCase()));
  const nameBy = new Map(communityUsers.map((u) => [u.email.toLowerCase(), u.name]));

  const profiles = await prisma.memberProfileExt.findMany({
    where: {
      membershipStatus: "resigned",
      userEmail: { in: [...emailSet] },
    },
    orderBy: { resignedAt: "asc" },
  });

  return {
    policy,
    waiting: profiles.map((p) => {
      const evalResult = evaluateRejoinEligibility({
        policyEnabled: policy.enabled,
        waitDays: policy.waitDays,
        resignedAt: p.resignedAt,
        rejoinEligibleOn: p.rejoinEligibleOn,
      });
      return {
        email: p.userEmail,
        name: nameBy.get(p.userEmail.toLowerCase()) ?? p.userEmail,
        resignedAt: p.resignedAt?.toISOString() ?? null,
        eligibleOn: evalResult.eligibleOn,
        daysRemaining: evalResult.daysRemaining,
        waiting: evalResult.waiting,
        eligible: evalResult.eligible,
      };
    }),
  };
}

/** Members whose accounts were deactivated for non-renewal. */
export async function listDeactivatedMembers(communityId: string) {
  const communityUsers = await prisma.user.findMany({
    where: { communityId, role: "member" },
    select: { email: true, name: true },
  });
  const emailSet = new Set(communityUsers.map((u) => u.email.toLowerCase()));
  const nameBy = new Map(communityUsers.map((u) => [u.email.toLowerCase(), u.name]));

  const profiles = await prisma.memberProfileExt.findMany({
    where: {
      membershipStatus: "deactivated",
      userEmail: { in: [...emailSet] },
    },
    orderBy: { membershipExpiresOn: "asc" },
  });

  return profiles.map((p) => ({
    email: p.userEmail,
    name: nameBy.get(p.userEmail.toLowerCase()) ?? p.userEmail,
    membershipExpiresOn: p.membershipExpiresOn ?? null,
    membershipTier: p.membershipTier,
  }));
}

export async function reactivateMembership(input: {
  userEmail: string;
  membershipExpiresOn?: string | null;
}) {
  const email = input.userEmail.toLowerCase();
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
  });
  if (!profile || profile.membershipStatus !== "deactivated") {
    return { ok: false as const, error: "Membership is not deactivated." };
  }

  await prisma.memberProfileExt.update({
    where: { userEmail: email },
    data: {
      membershipStatus: "active",
      membershipExpiresOn:
        input.membershipExpiresOn ?? profile.membershipExpiresOn,
      resignedAt: null,
      rejoinEligibleOn: null,
    },
  });

  return { ok: true as const };
}

export async function getMembershipSnapshot(
  userEmail: string,
  communityId = "__missing_community__",
) {
  const email = userEmail.toLowerCase();
  const policy = await ensureRejoinPolicy(communityId);
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
  });
  const evalResult = evaluateRejoinEligibility({
    policyEnabled: policy.enabled && profile?.membershipStatus === "resigned",
    waitDays: policy.waitDays,
    resignedAt: profile?.resignedAt,
    rejoinEligibleOn: profile?.rejoinEligibleOn,
  });
  const notices = await prisma.membershipRejoinNotice.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    policy: {
      enabled: policy.enabled,
      waitDays: policy.waitDays,
      memberRemindDaysBefore: policy.memberRemindDaysBefore,
      staffRemindDaysBefore: policy.staffRemindDaysBefore,
      notes: policy.notes,
    },
    status: profile?.membershipStatus ?? "active",
    resignedAt: profile?.resignedAt?.toISOString() ?? null,
    membershipExpiresOn: profile?.membershipExpiresOn ?? null,
    rejoinEligibleOn: evalResult.eligibleOn,
    daysRemaining: evalResult.daysRemaining,
    waiting: evalResult.waiting,
    eligible: profile?.membershipStatus === "resigned" ? evalResult.eligible : true,
    notices: notices.map((n) => ({
      id: n.id,
      level: n.level,
      message: n.message,
      daysRemaining: n.daysRemaining,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/** Daily: remind members nearing eligibility; warn staff with remaining wait time. */
export async function processRejoinReminders(
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
      total += await processRejoinReminders(row.communityId);
    }
    return total;
  }

  const policy = await ensureRejoinPolicy(cid);
  if (!policy.enabled) return 0;

  const profiles = await prisma.memberProfileExt.findMany({
    where: { membershipStatus: "resigned" },
  });
  let count = 0;

  for (const p of profiles) {
    const evalResult = evaluateRejoinEligibility({
      policyEnabled: true,
      waitDays: policy.waitDays,
      resignedAt: p.resignedAt,
      rejoinEligibleOn: p.rejoinEligibleOn,
    });
    const user = await prisma.user.findUnique({ where: { email: p.userEmail } });
    const name = user?.name ?? p.userEmail;
    const days = evalResult.daysRemaining;

    if (evalResult.eligible) {
      await createNoticeIfNew({
        communityId: cid,
        userEmail: p.userEmail,
        audience: "member",
        level: "eligible",
        message: rejoinWaitMessage({
          memberName: name,
          waitDays: policy.waitDays,
          daysRemaining: 0,
          eligibleOn: evalResult.eligibleOn,
        }),
        daysRemaining: 0,
      });
      await notifyMembershipStaff(
        cid,
        `${name} has completed the rejoin wait and may reapply.`,
        "eligible",
        0,
      );
      count++;
      continue;
    }

    if (
      days != null &&
      days <= policy.memberRemindDaysBefore &&
      days > 0
    ) {
      await createNoticeIfNew({
        communityId: cid,
        userEmail: p.userEmail,
        audience: "member",
        level: "eligible_soon",
        message: rejoinWaitMessage({
          memberName: name,
          waitDays: policy.waitDays,
          daysRemaining: days,
          eligibleOn: evalResult.eligibleOn,
        }),
        daysRemaining: days,
      });
      count++;
    }

    if (
      days != null &&
      days <= policy.staffRemindDaysBefore &&
      days > 0
    ) {
      await notifyMembershipStaff(
        cid,
        rejoinWaitMessage({
          memberName: name,
          waitDays: policy.waitDays,
          daysRemaining: days,
          eligibleOn: evalResult.eligibleOn,
          forStaff: true,
        }),
        "eligible_soon",
        days,
      );
      count++;
    }
  }

  return count;
}

export async function ensureDemoRejoinCase(communityId: string) {
  await ensureRejoinPolicy(communityId);
  const email = "jordan.hayes@oceanside.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const sponsor = await prisma.user.findFirst({
      where: { role: "member", communityId },
    });
    if (!sponsor) return;
    await prisma.user.create({
      data: {
        email,
        password: sponsor.password,
        role: "member",
        name: "Jordan Hayes",
        communityId,
      },
    });
  }

  const resignedAt = new Date();
  resignedAt.setDate(resignedAt.getDate() - 300);
  const eligibleOn = addDaysIso(resignedAt, DEFAULT_WAIT_DAYS);

  await prisma.memberProfileExt.upsert({
    where: { userEmail: email },
    create: {
      userEmail: email,
      membershipTier: "social",
      membershipStatus: "resigned",
      resignedAt,
      rejoinEligibleOn: eligibleOn,
      unit: "Off property",
      residencyStatus: "non_resident",
      paysHoa: false,
    },
    update: {
      membershipStatus: "resigned",
      resignedAt,
      rejoinEligibleOn: eligibleOn,
    },
  });

  const open = await prisma.membershipResignation.findFirst({
    where: { userEmail: email, status: "open" },
  });
  if (!open) {
    await prisma.membershipResignation.create({
      data: {
        communityId,
        userEmail: email,
        resignedAt,
        rejoinEligibleOn: eligibleOn,
        reason: "Relocated for work",
        status: "open",
      },
    });
  }
}
