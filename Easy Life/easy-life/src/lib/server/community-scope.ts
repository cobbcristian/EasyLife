/**
 * Whether a session may treat `membershipRole` as the active community via the
 * client-writable active-community cookie.
 *
 * Privileged JWTs (admin/pm/board) must not scope into a club where they only
 * hold a lesser membership seat — otherwise forging the cookie grants
 * cross-tenant admin/PM powers after joining via invite as a member.
 */
export function canUseActiveCommunityCookie(opts: {
  sessionRole: string;
  membershipRole: string | null;
}): boolean {
  if (!opts.membershipRole) return false;
  if (
    opts.sessionRole === "admin" ||
    opts.sessionRole === "pm" ||
    opts.sessionRole === "board"
  ) {
    return (
      opts.membershipRole === opts.sessionRole ||
      opts.membershipRole === "admin"
    );
  }
  return true;
}
