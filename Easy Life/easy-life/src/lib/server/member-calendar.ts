import { getCommunityBookings } from "@/lib/communities-data";
import type { CalendarEventDTO } from "@/lib/member-dtos";
import {
  listBookingsVisibleToMember,
  listCommunityEvents,
  listOrdersForMember,
  listTournaments,
} from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

function sortKey(item: CalendarEventDTO): string {
  const time = (item.time ?? "99:99").replace(/\s/g, "").toLowerCase();
  return `${item.date}|${time}|${item.title}`;
}

/**
 * Full day agenda for the member calendar: club-wide activity + personal items.
 */
export async function buildMemberCalendarAgenda(input: {
  communityId: string | null | undefined;
  email: string;
  name: string;
}): Promise<CalendarEventDTO[]> {
  const { communityId, email, name } = input;
  if (!communityId) return [];

  const memberName = name.trim().toLowerCase();
  const memberEmail = email.trim().toLowerCase();

  const [events, bookings, orders, tournaments, pendingInvites] =
    await Promise.all([
      listCommunityEvents(communityId),
      listBookingsVisibleToMember(email),
      listOrdersForMember(email),
      listTournaments(communityId),
      prisma.bookingInvite.findMany({
        where: { memberEmail, status: "pending" },
        select: { bookingId: true },
        take: 40,
      }),
    ]);

  const visibleIds = new Set(bookings.map((b) => b.id));
  const pendingIds = pendingInvites
    .map((i) => i.bookingId)
    .filter((id) => !visibleIds.has(id));
  const pendingBookings =
    pendingIds.length > 0
      ? await prisma.booking.findMany({
          where: { id: { in: pendingIds }, status: { not: "cancelled" } },
        })
      : [];

  const clubEvents: CalendarEventDTO[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date,
    time: e.time,
    endTime: e.endTime,
    location: e.location,
    category: e.category || "community",
    isPromoted: e.isPromoted,
    requirePayment: e.requirePayment,
    feeCents: e.feeCents,
    rsvpCount: e.rsvps.length,
    userRsvped: e.rsvps.some((r) => r.memberEmail.toLowerCase() === memberEmail),
    source: "event",
    scope: e.rsvps.some((r) => r.memberEmail.toLowerCase() === memberEmail)
      ? "you"
      : "club",
    href: `/member/events/${e.id}`,
  }));

  const amenityBookings: CalendarEventDTO[] = [
    ...bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => {
        const isHost = b.memberEmail.trim().toLowerCase() === memberEmail;
        return {
          id: `booking-${b.id}`,
          bookingId: b.id,
          title: b.amenity,
          description: isHost
            ? b.status === "completed"
              ? "Completed amenity booking"
              : "Your amenity booking"
            : `You're going · hosted by ${b.memberName}`,
          date: b.date,
          time: `${b.startTime}–${b.endTime}`,
          endTime: b.endTime,
          location: "",
          category: "booking",
          isPromoted: false,
          rsvpCount: 0,
          userRsvped: true,
          source: "booking" as const,
          scope: "you" as const,
          href: `/member/reservations/${b.id}`,
        };
      }),
    ...pendingBookings.map((b) => ({
      id: `booking-invite-${b.id}`,
      bookingId: b.id,
      title: b.amenity,
      description: `Invitation · hosted by ${b.memberName}`,
      date: b.date,
      time: `${b.startTime}–${b.endTime}`,
      endTime: b.endTime,
      location: "",
      category: "booking",
      isPromoted: false,
      rsvpCount: 0,
      userRsvped: false,
      source: "booking" as const,
      scope: "you" as const,
      href: `/member/reservations/${b.id}`,
    })),
  ];

  const serviceVisits: CalendarEventDTO[] = getCommunityBookings(communityId)
    .filter(
      (b) =>
        b.status !== "cancelled" &&
        (!memberName || b.resident.trim().toLowerCase() === memberName),
    )
    .map((b) => ({
      id: `service-${b.id}`,
      bookingId: b.id,
      title: b.provider,
      description:
        b.status === "completed" ? `${b.service} · completed` : b.service,
      date: b.date,
      time: b.endTime ? `${b.time}–${b.endTime}` : b.time,
      endTime: b.endTime ?? null,
      location: "",
      category: "service",
      isPromoted: false,
      rsvpCount: 0,
      userRsvped: true,
      source: "service" as const,
      scope: "you" as const,
      href: `/member/service-bookings/${b.id}`,
    }));

  const diningItems: CalendarEventDTO[] = orders
    .filter((o) => o.status !== "cancelled" && Boolean(o.arriveDate))
    .map((o) => {
      const fulfillment =
        o.fulfillment === "eat_in"
          ? "Eat-in"
          : o.fulfillment === "takeout"
            ? "Takeout"
            : o.fulfillment === "delivery"
              ? "Delivery"
              : o.fulfillment;
      const done =
        o.status === "completed" || o.status === "ready" || o.status === "picked_up";
      return {
        id: `dining-${o.id}`,
        title: o.restaurant?.trim() || "Club dining",
        description: `${fulfillment}${o.partySize ? ` · party of ${o.partySize}` : ""}${
          done ? " · completed" : ""
        }`,
        date: o.arriveDate!,
        time: o.arriveTime ?? o.readyBy ?? null,
        endTime: null,
        location: o.tableLabel ? `Table ${o.tableLabel}` : "",
        category: "dining",
        isPromoted: false,
        rsvpCount: 0,
        userRsvped: true,
        source: "dining" as const,
        scope: "you" as const,
        href: "/member/dining",
      };
    });

  const tournamentItems: CalendarEventDTO[] = tournaments.map((t) => {
    const playing = t.players.some(
      (p) => p.memberEmail?.toLowerCase() === memberEmail,
    );
    return {
      id: `tournament-${t.id}`,
      title: t.title,
      description: playing
        ? `You're registered · ${t.sport}`
        : `Club tournament · ${t.sport}`,
      date: t.date,
      time: t.startTime ?? null,
      endTime: null,
      location: "",
      category: t.sport || "tournament",
      isPromoted: false,
      rsvpCount: t.players.length,
      userRsvped: playing,
      source: "tournament" as const,
      scope: playing ? ("you" as const) : ("club" as const),
      href: "/member/tournaments",
    };
  });

  // RSVP'd club events also appear under "you" without duplicating the club row:
  // keep one row; scope flips to "you" when RSVP'd (already handled above).

  return [
    ...clubEvents,
    ...amenityBookings,
    ...serviceVisits,
    ...diningItems,
    ...tournamentItems,
  ].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}
