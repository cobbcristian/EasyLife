/**
 * Club-scoped amenity mutations (playability / delete).
 * Super-admins (admin with no communityId) may act across clubs.
 */
export function canMutateAmenityCommunity(
  session: { role: string; communityId?: string | null },
  amenityCommunityId: string,
): boolean {
  const staff =
    session.role === "admin" ||
    session.role === "pm" ||
    session.role === "board";
  if (!staff) return false;
  if (session.role === "admin" && !session.communityId) return true;
  return Boolean(session.communityId) && session.communityId === amenityCommunityId;
}
