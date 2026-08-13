import { communityIsResidentialHoa } from "@/lib/community-features";
import { prisma } from "@/lib/server/prisma";
import type { AuthRole } from "@/lib/types";

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

/** Active membership role in a community, or null if none. */
export async function getActiveMembershipRole(
  userId: string,
  communityId: string,
): Promise<string | null> {
  const row = await prisma.userCommunity.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
    select: { status: true, role: true },
  });
  if (!row || row.status !== "active") return null;
  return row.role;
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
  await prisma.user.update({
    where: { id: input.userId },
    data: { communityId: input.communityId },
  });

  return { ok: true, role: membership.role as AuthRole };
}

/**
 * Attach a second club to an existing account (invite join without new user).
 * Always creates a member seat — invite codes must never copy admin/pm/board
 * privileges from the user's primary club.
 */
export async function joinAdditionalCommunity(input: {
  userId: string;
  communityId: string;
  inviteCode?: string;
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

  // Residential HOAs require staff approval — do not grant active access via invite.
  if (communityIsResidentialHoa(community.id)) {
    return {
      error:
        "This community requires management approval to join. Ask property management to add you.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!user) return { error: "User not found" };

  await upsertMembership({
    userId: input.userId,
    communityId: community.id,
    role: "member",
    status: "active",
    isPrimary: false,
  });

  return { ok: true };
}
