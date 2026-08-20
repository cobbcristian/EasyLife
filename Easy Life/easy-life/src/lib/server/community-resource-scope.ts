/**
 * Club-scoped staff may only mutate resources in their own community.
 * Super-admins (no communityId on the session) may act across clubs.
 */
export function canMutateCommunityResource(
  sessionCommunityId: string | null | undefined,
  resourceCommunityId: string,
): boolean {
  if (!sessionCommunityId) return true;
  return sessionCommunityId === resourceCommunityId;
}
