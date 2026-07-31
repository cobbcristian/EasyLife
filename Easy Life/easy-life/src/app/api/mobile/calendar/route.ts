import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  ensureRecordsSeeded,
  listBookingsForMember,
  listCommunityEvents,
} from "@/lib/server/records";
import { autoRsvpPromotedEvents } from "@/lib/server/project-management";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  try {
    await autoRsvpPromotedEvents({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
    });
  } catch (err) {
    console.error("[mobile/calendar] auto-rsvp failed", err);
  }

  const [events, bookings] = await Promise.all([
    listCommunityEvents(session.communityId),
    listBookingsForMember(session.email),
  ]);

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      location: e.location,
      category: e.category,
      going: e.rsvps.some((r) => r.memberEmail === session.email),
    })),
    bookings: bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({
        id: b.id,
        title: b.amenity,
        date: b.date,
        time: `${b.startTime}-${b.endTime}`,
        status: b.status,
      })),
  });
}
