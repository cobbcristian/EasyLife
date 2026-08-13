import { prisma } from "@/lib/server/prisma";
import type { AuthRole, SessionPayload } from "@/lib/types";

/**
 * JWT claims after a successful club switch.
 * Role must come from the target membership — never reuse the prior session role,
 * or a PM/board user who is only a member at another club keeps elevated privileges.
 */
export function sessionClaimsForCommunitySwitch(
  session: Pick<SessionPayload, "sub" | "email" | "name">,
  switched: { communityId: string; role: AuthRole },
): SessionPayload {
  return {
    sub: session.sub,
    email: session.email,
    name: session.name,
    role: switched.role,
    communityId: switched.communityId,
  };
}

export type MembershipRow = {
  id: string;
  communityId: string;
  communityName: string;
  logoUrl: string | null;
  role: string;
  status: string;
  isPrimary: boolean;
};

/** Backfill UserCommunity from legacy User.communityId rows. */
export async function ensureMembershipBackfill(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { communityId: { not: null } },
    select: { id: true, communityId: true, role: true },
  });
  if (users.length === 0) return;

  const existing = await prisma.userCommunity.findMany({
    select: { userId: true, communityId: true },
  });
  const have = new Set(existing.map((e) => `${e.userId}:${e.communityId}`));

  const toCreate = users.filter(
    (u) => u.communityId && !have.has(`${u.id}:${u.communityId}`),
  );
  if (toCreate.length === 0) return;

  await prisma.userCommunity.createMany({
    data: toCreate.map((u) => ({
      userId: u.id,
      communityId: u.communityId!,
      role: u.role,
      status: "active",
      isPrimary: true,
    })),
    skipDuplicates: true,
  });
}

export async function listUserMemberships(
  userId: string,
): Promise<MembershipRow[]> {
  await ensureMembershipBackfill();
  const rows = await prisma.userCommunity.findMany({
    where: { userId, status: "active" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (rows.length === 0) return [];

  const communities = await prisma.community.findMany({
    where: { id: { in: rows.map((r) => r.communityId) } },
    select: { id: true, name: true, logoUrl: true },
  });
  const byId = new Map(communities.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const c = byId.get(r.communityId);
      if (!c) return null;
      return {
        id: r.id,
        communityId: r.communityId,
        communityName: c.name,
        logoUrl: c.logoUrl,
        role: r.role,
        status: r.status,
        isPrimary: r.isPrimary,
      };
    })
    .filter((r): r is MembershipRow => r != null);
}

export async function upsertMembership(input: {
  userId: string;
  communityId: string;
  role: string;
  status?: "active" | "invited" | "revoked";
  isPrimary?: boolean;
}): Promise<void> {
  const status = input.status ?? "active";
  const existingCount = await prisma.userCommunity.count({
    where: { userId: input.userId, status: "active" },
  });
  const isPrimary = input.isPrimary ?? existingCount === 0;

  if (isPrimary) {
    await prisma.userCommunity.updateMany({
      where: { userId: input.userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  await prisma.userCommunity.upsert({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
    create: {
      userId: input.userId,
      communityId: input.communityId,
      role: input.role,
      status,
      isPrimary,
    },
    update: {
      role: input.role,
      status,
      ...(input.isPrimary !== undefined ? { isPrimary } : {}),
    },
  });
}

export async function userHasActiveMembership(
  userId: string,
  communityId: string,
): Promise<boolean> {
  const row = await prisma.userCommunity.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
    select: { status: true },
  });
  return row?.status === "active";
}

/**
 * Switch active community: validates membership, updates cached User.communityId
 * and primary flag. Caller refreshes the session JWT + cookie.
 */
export async function switchActiveCommunity(input: {
  userId: string;
  communityId: string;
}): Promise<{ ok: true; role: AuthRole } | { error: string }> {
  const membership = await prisma.userCommunity.findUnique({
    where: {
      userId_communityId: {
        userId: input.userId,
        communityId: input.communityId,
      },
    },
  });
  if (!membership || membership.status !== "active") {
    return { error: "You are not a member of that community" };
  }

  await prisma.userCommunity.updateMany({
    where: { userId: input.userId, isPrimary: true },
    data: { isPrimary: false },
  });
  await prisma.userCommunity.update({
    where: { id: membership.id },
    data: { isPrimary: true },
  });
  const role = membership.role as AuthRole;
  // Keep legacy User.communityId + User.role aligned with the active membership.
  await prisma.user.update({
    where: { id: input.userId },
    data: { communityId: input.communityId, role },
  });

  return { ok: true, role };
}

/**
 * Attach a second club to an existing account (invite join without new user).
 */
export async function joinAdditionalCommunity(input: {
  userId: string;
  communityId: string;
  inviteCode?: string;
  role?: AuthRole;
}): Promise<{ ok: true } | { error: string }> {
  const community = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: { id: true, inviteCode: true },
  });
  if (!community) return { error: "Community not found" };

  const invite = input.inviteCode?.trim() ?? "";
  if (community.inviteCode) {
    if (!invite) return { error: "Invite code is required" };
    if (invite !== community.inviteCode) {
      return { error: "Invalid invite code for this community" };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });
  if (!user) return { error: "User not found" };

  const role = input.role ?? (user.role as AuthRole);
  await upsertMembership({
    userId: input.userId,
    communityId: community.id,
    role,
    status: "active",
    isPrimary: false,
  });

  return { ok: true };
}
