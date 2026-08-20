/**
 * Event cancel / invite authorization.
 * Display-name matching alone allows same-named members to delete each other's events.
 */

export type EventOrganizerAuthInput = {
  createdBy: string;
  createdByEmail?: string | null;
  communityId: string;
  /** Earliest RSVP whose name matches createdBy (legacy events without createdByEmail). */
  legacyOrganizerEmail?: string | null;
};

export type EventActor = {
  email: string;
  name: string;
  role: string;
  communityId?: string | null;
};

export function canManageCommunityEvent(
  event: EventOrganizerAuthInput,
  actor: EventActor,
): boolean {
  const email = actor.email.trim().toLowerCase();
  if (!email) return false;

  const sameClub =
    Boolean(actor.communityId) && actor.communityId === event.communityId;
  const isStaff =
    sameClub &&
    (actor.role === "admin" || actor.role === "pm" || actor.role === "board");
  if (isStaff) return true;

  // Platform super-admin (admin, no community) may manage any event.
  if (actor.role === "admin" && !actor.communityId) return true;

  if (!sameClub) return false;

  const organizerEmail = (
    event.createdByEmail ??
    event.legacyOrganizerEmail ??
    ""
  )
    .trim()
    .toLowerCase();
  return Boolean(organizerEmail) && organizerEmail === email;
}
