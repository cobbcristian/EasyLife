/**
 * Helpers that decide what a staff/account delete may touch.
 * Keep these pure so tenant scope is unit-testable without Prisma.
 */

export type ProviderEmailRow = {
  id: string;
  communityId: string;
  email: string | null;
};

export type MembershipRowLite = {
  id: string;
  communityId: string;
  role: string;
  status: string;
  isPrimary: boolean;
};

/** Provider listings whose email matches, optionally limited to one club. */
export function providerIdsMatchingEmail(
  providers: ProviderEmailRow[],
  email: string,
  scopeCommunityId?: string | null,
): string[] {
  const key = email.trim().toLowerCase();
  return providers
    .filter((p) => (p.email ?? "").trim().toLowerCase() === key)
    .filter((p) => !scopeCommunityId || p.communityId === scopeCommunityId)
    .map((p) => p.id);
}

/**
 * Plan a club-scoped staff removal for a multi-club user.
 * Never implies wiping other clubs' memberships or provider listings.
 */
export function planStaffCommunityRemoval(input: {
  removeCommunityId: string;
  memberships: MembershipRowLite[];
}): {
  revokeMembershipId: string | null;
  deleteUser: boolean;
  nextPrimary: { communityId: string; role: string } | null;
} {
  const active = input.memberships.filter((m) => m.status === "active");
  const target =
    active.find((m) => m.communityId === input.removeCommunityId) ?? null;
  const remaining = active.filter(
    (m) => m.communityId !== input.removeCommunityId,
  );

  if (remaining.length === 0) {
    return {
      revokeMembershipId: target?.id ?? null,
      deleteUser: true,
      nextPrimary: null,
    };
  }

  const next =
    remaining.find((m) => m.isPrimary) ??
    remaining[0] ??
    null;

  return {
    revokeMembershipId: target?.id ?? null,
    deleteUser: false,
    nextPrimary: next
      ? { communityId: next.communityId, role: next.role }
      : null,
  };
}
