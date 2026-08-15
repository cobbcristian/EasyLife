/**
 * Ownership checks for mobile "pay / complete service request" flows.
 * Prevents IDOR where any authenticated user marks another member's request completed.
 */

export function canCompleteServiceRequestPayment(opts: {
  requestMemberEmail: string;
  sessionEmail: string;
  requestCommunityId?: string | null;
  sessionCommunityId?: string | null;
}): boolean {
  const requestEmail = opts.requestMemberEmail.trim().toLowerCase();
  const sessionEmail = opts.sessionEmail.trim().toLowerCase();
  if (!requestEmail || !sessionEmail || requestEmail !== sessionEmail) {
    return false;
  }
  if (
    opts.sessionCommunityId &&
    opts.requestCommunityId &&
    opts.requestCommunityId !== opts.sessionCommunityId
  ) {
    return false;
  }
  return true;
}
