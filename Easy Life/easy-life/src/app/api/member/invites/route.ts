import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listBookingInvitesForMember } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

/** Pending event + amenity booking invites for the signed-in web member. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.email.trim().toLowerCase();

  const [eventInvites, bookingInvites] = await Promise.all([
    prisma.eventInvite.findMany({
      where: { memberEmail: email, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    listBookingInvitesForMember(email),
  ]);

  const eventIds = [...new Set(eventInvites.map((i) => i.eventId))];
  const events =
    eventIds.length > 0
      ? await prisma.communityEvent.findMany({ where: { id: { in: eventIds } } })
      : [];
  const byId = new Map(events.map((e) => [e.id, e]));

  const eventRows = eventInvites.map((i) => {
    const event = byId.get(i.eventId);
    return {
      id: i.id,
      type: "event" as const,
      status: i.status,
      eventId: i.eventId,
      bookingId: null as string | null,
      title: event?.title ?? "Event",
      date: event?.date ?? "",
      time: event?.time ?? null,
      location: event?.location ?? "",
      hostName: event?.createdBy ?? "",
      requirePayment: event?.requirePayment ?? false,
      feeCents: event?.feeCents ?? 0,
    };
  });

  return NextResponse.json({
    invites: [...bookingInvites, ...eventRows].sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    ),
  });
}
