import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import {
  createBooking,
  ensureRecordsSeeded,
  listBookingsForMember,
  logEvent,
  BookingConflictError,
} from "@/lib/server/records";
import { parseBody, bookingSchema } from "@/lib/server/validation";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function GET(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();
  const bookings = await listBookingsForMember(session.email);
  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      amenity: b.amenity,
      date: b.date,
      time: `${b.startTime} – ${b.endTime}`,
      status: b.status,
    })),
  });
}

export async function POST(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(bookingSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  let booking;
  try {
    booking = await createBooking({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      amenity: parsed.data.amenity ?? "",
      amenityId: parsed.data.amenityId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      inviteCapacity: parsed.data.inviteCapacity,
      invites: parsed.data.invites,
      addons: parsed.data.addons,
    });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Booking",
    detail: `${booking.amenity} — ${parsed.data.date}`,
  });
  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id,
      amenity: booking.amenity,
      date: booking.date,
      time: `${booking.startTime} – ${booking.endTime}`,
      status: booking.status,
    },
  });
}
