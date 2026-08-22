/**
 * Staff may only reactivate members of their own club (primary User.communityId
 * or an active UserCommunity seat). Prevents cross-tenant reactivation by email.
 */
export function memberInCommunityScope(input: {
  primaryCommunityId: string | null | undefined;
  membershipCommunityIds: readonly string[];
  communityId: string;
}): boolean {
  const cid = input.communityId.trim();
  if (!cid) return false;
  if (input.primaryCommunityId === cid) return true;
  return input.membershipCommunityIds.includes(cid);
}
