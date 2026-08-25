/**
 * Community-scoped authorization for community events (RSVP, cancel, invite, detail).
 * Event.createdBy is a display name only — never trust name alone across clubs.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** True when the event is in the caller's club (null community never matches). */
export function eventBelongsToSessionCommunity(
  eventCommunityId: string,
  sessionCommunityId: string | null | undefined,
): boolean {
  return Boolean(sessionCommunityId) && eventCommunityId === sessionCommunityId;
}

export function isClubStaffRole(role: string): boolean {
  return role === "admin" || role === "board" || role === "pm";
}

export type EventActor = {
  email: string;
  name: string;
  role: string;
  communityId?: string | null;
};

/**
 * Resolve organizer email from the host RSVP row (created on event create).
 * Falls back to null for legacy events that only stored createdBy name.
 */
export function resolveOrganizerEmail(
  rsvps: Array<{ memberEmail: string; memberName: string }>,
  createdBy: string,
): string | null {
  const host = rsvps.find((r) => namesMatch(r.memberName, createdBy));
  if (!host?.memberEmail) return null;
  return normalizeEmail(host.memberEmail);
}

/**
 * Who may cancel or send invites for an event (caller must already enforce
 * same-community). Prefer organizer RSVP email; staff may manage any club event.
 * Name-only match is allowed only when no organizer email exists (legacy).
 */
export function canManageCommunityEvent(opts: {
  eventCreatedBy: string;
  actor: Pick<EventActor, "email" | "name" | "role">;
  organizerEmail: string | null | undefined;
}): boolean {
  if (isClubStaffRole(opts.actor.role)) return true;

  const actorEmail = normalizeEmail(opts.actor.email);
  const orgEmail = opts.organizerEmail
    ? normalizeEmail(opts.organizerEmail)
    : "";

  if (orgEmail && orgEmail === actorEmail) return true;

  if (!orgEmail && namesMatch(opts.eventCreatedBy, opts.actor.name)) {
    return true;
  }

  return false;
}

/** True when this member is the event host (not merely club staff). */
export function isEventOrganizer(opts: {
  eventCreatedBy: string;
  actorEmail: string;
  actorName: string;
  organizerEmail: string | null | undefined;
}): boolean {
  const actorEmail = normalizeEmail(opts.actorEmail);
  const orgEmail = opts.organizerEmail
    ? normalizeEmail(opts.organizerEmail)
    : "";
  if (orgEmail && orgEmail === actorEmail) return true;
  if (!orgEmail && namesMatch(opts.eventCreatedBy, opts.actorName)) return true;
  return false;
}
