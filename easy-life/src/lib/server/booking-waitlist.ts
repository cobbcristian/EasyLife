import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { sendPushToUser } from "@/lib/server/push";

export interface WaitlistEntryDTO {
  id: string;
  waitlistKind: string;
  amenity: string;
  restaurant: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  partySize: number;
  status: string;
  position: number;
  createdAt: string;
}

function toDto(row: {
  id: string;
  waitlistKind: string;
  amenity: string;
  restaurant: string | null;
  date: string;
  startTime: string;
  endTime: string | null;
  partySize: number;
  status: string;
  position: number;
  createdAt: Date;
}): WaitlistEntryDTO {
  return {
    id: row.id,
    waitlistKind: row.waitlistKind,
    amenity: row.amenity,
    restaurant: row.restaurant,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    partySize: row.partySize,
    status: row.status,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function joinBookingWaitlist(input: {
  communityId: string;
  memberEmail: string;
  memberName: string;
  waitlistKind?: "amenity" | "dining";
  amenityId?: string;
  amenity: string;
  restaurant?: string;
  date: string;
  startTime: string;
  endTime?: string;
  partySize?: number;
}): Promise<WaitlistEntryDTO> {
  await ensureRecordsSeeded();
  const waiting = await prisma.bookingWaitlist.count({
    where: {
      communityId: input.communityId,
      amenityId: input.amenityId ?? undefined,
      date: input.date,
      startTime: input.startTime,
      status: "waiting",
    },
  });

  const entry = await prisma.bookingWaitlist.create({
    data: {
      communityId: input.communityId,
      memberEmail: input.memberEmail.toLowerCase(),
      memberName: input.memberName,
      waitlistKind: input.waitlistKind ?? "amenity",
      amenityId: input.amenityId,
      amenity: input.amenity,
      restaurant: input.restaurant,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      partySize: input.partySize ?? 1,
      position: waiting + 1,
    },
  });

  return toDto(entry);
}

export async function listWaitlistForMember(memberEmail: string): Promise<WaitlistEntryDTO[]> {
  await ensureRecordsSeeded();
  const rows = await prisma.bookingWaitlist.findMany({
    where: { memberEmail: memberEmail.toLowerCase(), status: { in: ["waiting", "notified"] } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toDto);
}

export async function listWaitlistForCommunity(communityId: string): Promise<WaitlistEntryDTO[]> {
  await ensureRecordsSeeded();
  const rows = await prisma.bookingWaitlist.findMany({
    where: { communityId, status: { in: ["waiting", "notified"] } },
    orderBy: [{ date: "asc" }, { position: "asc" }],
  });
  return rows.map(toDto);
}

export async function cancelWaitlistEntry(id: string, memberEmail: string): Promise<boolean> {
  const row = await prisma.bookingWaitlist.findUnique({ where: { id } });
  if (!row || row.memberEmail !== memberEmail.toLowerCase()) return false;
  await prisma.bookingWaitlist.update({
    where: { id },
    data: { status: "cancelled" },
  });
  return true;
}

/** Notify next person on waitlist when a slot opens. */
export async function notifyNextOnWaitlist(input: {
  communityId: string;
  amenityId?: string;
  date: string;
  startTime: string;
}): Promise<WaitlistEntryDTO | null> {
  const next = await prisma.bookingWaitlist.findFirst({
    where: {
      communityId: input.communityId,
      amenityId: input.amenityId ?? undefined,
      date: input.date,
      startTime: input.startTime,
      status: "waiting",
    },
    orderBy: { position: "asc" },
  });
  if (!next) return null;

  const updated = await prisma.bookingWaitlist.update({
    where: { id: next.id },
    data: { status: "notified", notifiedAt: new Date() },
  });

  try {
    await sendPushToUser(next.memberEmail, {
      title: "Your slot is available",
      body: `${next.amenity} on ${next.date} at ${next.startTime} — book now before it goes to the next member.`,
      url: "/member/waitlist",
    });
  } catch {
    /* optional */
  }

  return toDto(updated);
}
