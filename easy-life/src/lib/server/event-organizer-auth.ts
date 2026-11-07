import { prisma } from "@/lib/server/prisma";

export type EventOrganizerTarget = {
  id: string;
  communityId: string;
  createdBy: string;
  createdByEmail: string | null;
};

/**
 * Resolve the organizer's email for authz.
 * Prefer stored createdByEmail; for legacy rows, use the earliest RSVP whose
 * display name matches createdBy (create always upserts the host RSVP first).
 */
export function pickLegacyOrganizerEmail(
  createdBy: string,
  rsvps: Array<{ memberEmail: string; memberName: string; createdAt: Date }>,
): string | null {
  const hostName = createdBy.trim().toLowerCase();
  if (!hostName) return null;
  const ordered = [...rsvps].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const host = ordered.find(
    (r) => r.memberName.trim().toLowerCase() === hostName,
  );
  return host?.memberEmail.trim().toLowerCase() || null;
}

export async function resolveEventOrganizerEmail(
  event: EventOrganizerTarget,
): Promise<string | null> {
  const stored = event.createdByEmail?.trim().toLowerCase();
  if (stored) return stored;

  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: event.id },
    select: { memberEmail: true, memberName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return pickLegacyOrganizerEmail(event.createdBy, rsvps);
}

export function organizerEmailAllowsManage(input: {
  organizerEmail: string | null;
  memberEmail: string;
  eventCommunityId: string;
  communityId?: string | null;
}): boolean {
  if (
    input.communityId &&
    input.eventCommunityId !== input.communityId
  ) {
    return false;
  }
  if (!input.organizerEmail) return false;
  return input.organizerEmail === input.memberEmail.trim().toLowerCase();
}

export async function canManageCommunityEvent(input: {
  event: EventOrganizerTarget;
  memberEmail: string;
  communityId?: string | null;
}): Promise<boolean> {
  const organizer = await resolveEventOrganizerEmail(input.event);
  return organizerEmailAllowsManage({
    organizerEmail: organizer,
    memberEmail: input.memberEmail,
    eventCommunityId: input.event.communityId,
    communityId: input.communityId,
  });
}
