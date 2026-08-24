import { isSuperAdmin } from "@/lib/server/community-context";
import type { SessionPayload } from "@/lib/types";

/** Staff who may dispatch / update any request in their club. */
export function isTramStaff(session: SessionPayload): boolean {
  return session.role === "pm" || session.role === "admin";
}

/**
 * Members may only touch their own requests.
 * Club PM/admin may manage requests in their community; platform super-admin any.
 */
export function canAccessTramRequest(
  session: SessionPayload,
  request: { communityId: string; memberEmail: string },
): boolean {
  if (isSuperAdmin(session)) return true;
  if (isTramStaff(session)) {
    return Boolean(
      session.communityId && session.communityId === request.communityId,
    );
  }
  return request.memberEmail.toLowerCase() === session.email.toLowerCase();
}

/** Members may only cancel; staff may update status/dispatch fields. */
export function canMutateTramRequest(
  session: SessionPayload,
  request: { communityId: string; memberEmail: string },
  nextStatus?: string,
): { ok: true } | { ok: false; status: 403; error: string } {
  if (!canAccessTramRequest(session, request)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (isSuperAdmin(session) || isTramStaff(session)) {
    return { ok: true };
  }
  if (nextStatus !== "cancelled") {
    return {
      ok: false,
      status: 403,
      error: "Members can only cancel requests",
    };
  }
  return { ok: true };
}
