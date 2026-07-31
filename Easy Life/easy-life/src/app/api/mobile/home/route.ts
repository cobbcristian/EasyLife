import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  ensureRecordsSeeded,
  listBookingInvitesForMember,
  listBookingsForMember,
  listCommunityEvents,
} from "@/lib/server/records";
import { getCommunityBookings } from "@/lib/communities-data";
import { listAllProviders } from "@/lib/server/db";
import {
  ensureSeedMemberInbox,
  listMemberInbox,
} from "@/lib/server/project-management";
import { listChatThreadsForUser } from "@/lib/server/local-pros";
import { isActiveServiceBooking } from "@/lib/types";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const community = await prisma.community.findUnique({
    where: { id: session.communityId },
    select: { appDisplayName: true, name: true },
  });
  await ensureSeedMemberInbox(
    session.email,
    community?.appDisplayName ?? community?.name ?? null,
  );

  const email = session.email.trim().toLowerCase();

  const [bookings, events, allProviders, inbox, bookingInvites, eventInvites, threads] =
    await Promise.all([
      listBookingsForMember(session.email),
      listCommunityEvents(session.communityId),
      listAllProviders(),
      listMemberInbox(session.email),
      listBookingInvitesForMember(email),
      prisma.eventInvite.findMany({
        where: { memberEmail: email, status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      listChatThreadsForUser(session.email, session.communityId ?? null),
    ]);

  const providers = allProviders;

  const serviceBookings = getCommunityBookings(session.communityId)
    .filter(
      (b) =>
        b.resident.toLowerCase() === session.name.toLowerCase() &&
        isActiveServiceBooking(b.status),
    )
    .slice(0, 5);

  const upcoming = [
    ...bookings
      .filter((b) => b.status !== "cancelled")
      .slice(0, 5)
      .map((b) => ({
        id: `b-${b.id}`,
        title: b.amenity,
        status: b.status === "confirmed" ? "Confirmed" : "Pending",
        date: b.date,
        time: `${b.startTime} – ${b.endTime}`,
        kind: "booking" as const,
      })),
    ...events.slice(0, 5).map((e) => ({
      id: `e-${e.id}`,
      title: e.title,
      status: e.rsvps.some((r) => r.memberEmail === session.email)
        ? "Going"
        : "Open",
      date: e.date,
      time: e.time ?? "",
      kind: "event" as const,
    })),
    ...serviceBookings.map((b) => ({
      id: `s-${b.id}`,
      title: b.service,
      status: b.status === "accepted" ? "Confirmed" : "Pending",
      date: b.date,
      time: b.endTime ? `${b.time} – ${b.endTime}` : b.time,
      kind: "service" as const,
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 8);

  const eventIds = [...new Set(eventInvites.map((i) => i.eventId))];
  const inviteEvents =
    eventIds.length > 0
      ? await prisma.communityEvent.findMany({ where: { id: { in: eventIds } } })
      : [];
  const eventById = new Map(inviteEvents.map((e) => [e.id, e]));

  const pendingInvites = [
    ...bookingInvites.map((i) => ({
      id: i.id,
      type: "booking" as const,
      title: i.title,
      subtitle: i.hostName
        ? `${i.hostName} · ${i.date}${i.time ? ` · ${i.time}` : ""}`
        : `${i.date}${i.time ? ` · ${i.time}` : ""}`,
      hostName: i.hostName ?? "",
    })),
    ...eventInvites.map((i) => {
      const event = eventById.get(i.eventId);
      return {
        id: i.id,
        type: "event" as const,
        title: event?.title ?? "Event",
        subtitle: `${event?.date ?? ""}${event?.time ? ` · ${event.time}` : ""}`,
        hostName: event?.createdBy ?? "",
      };
    }),
  ].slice(0, 5);

  const threadIds = threads.map((t) => t.id);
  const recentMessages =
    threadIds.length === 0
      ? []
      : await prisma.chatMessage.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: { createdAt: "desc" },
          take: threadIds.length * 3,
          select: { threadId: true, authorEmail: true },
        });
  const lastAuthorByThread = new Map<string, string>();
  for (const m of recentMessages) {
    if (!lastAuthorByThread.has(m.threadId)) {
      lastAuthorByThread.set(m.threadId, m.authorEmail.toLowerCase());
    }
  }
  const unreadMessages = threads.filter((t) => {
    const author = lastAuthorByThread.get(t.id);
    return Boolean(author && author !== email);
  }).length;

  return NextResponse.json({
    greeting: session.name.split(" ")[0] || session.name,
    featured: providers.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      rating: p.rating ?? 4.5,
      type: p.type,
    })),
    upcoming,
    nextUp: upcoming[0] ?? null,
    pendingInvites,
    pendingInviteCount: bookingInvites.length + eventInvites.length,
    unreadMessages,
    notificationCount: inbox.filter((n) => !n.read).length,
  });
}
