import type { AuthRole } from "@/lib/types";

export type RefundResolveActor = {
  role: AuthRole | string;
  email: string;
  communityId?: string | null;
};

export type RefundResolveTarget = {
  providerEmail: string | null;
  communityId: string;
};

/**
 * Providers may only resolve refunds assigned to their email.
 * Admin/PM may resolve within their club (or any club if super-admin).
 */
export function canActorResolveRefund(
  actor: RefundResolveActor,
  refund: RefundResolveTarget,
): boolean {
  const email = actor.email.trim().toLowerCase();
  if (!email) return false;

  if (actor.role === "provider") {
    const owner = refund.providerEmail?.trim().toLowerCase() ?? "";
    return owner !== "" && owner === email;
  }

  if (actor.role === "admin" || actor.role === "pm") {
    // Super-admin: communityId unset on session
    if (actor.role === "admin" && !actor.communityId) return true;
    return !!actor.communityId && actor.communityId === refund.communityId;
  }

  return false;
}
