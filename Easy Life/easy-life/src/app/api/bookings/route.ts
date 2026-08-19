import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createBooking, ensureRecordsSeeded, listBookingsForMember, logEvent, BookingConflictError, MembershipAccessError } from "@/lib/server/records";
import { sendPushToUser } from "@/lib/server/push";
import { parseBody, bookingSchema } from "@/lib/server/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  return NextResponse.json({ bookings: await listBookingsForMember(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      unitNumber: parsed.data.unitNumber,
      inviteCapacity: parsed.data.inviteCapacity,
      invites: parsed.data.invites,
      addons: parsed.data.addons,
    });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof MembershipAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Booking",
    detail: `${booking.amenity} — ${parsed.data.date}`,
  });
  const needsPayment = Boolean(booking.chargeId && (booking.feeAmount ?? 0) > 0);
  try {
    await sendPushToUser(session.email, {
      title: needsPayment ? "Booking reserved — payment due" : "Booking confirmed",
      body: needsPayment
        ? `${booking.amenity} on ${parsed.data.date} at ${parsed.data.startTime} — complete payment to confirm`
        : `${booking.amenity} on ${parsed.data.date} at ${parsed.data.startTime}`,
      url: `/member/reservations/${booking.id}?added=1`,
    });
  } catch {
    /* push optional */
  }
  revalidatePath("/member/bookings");
  revalidatePath("/member/calendar");
  revalidatePath(`/member/reservations/${booking.id}`);
  return NextResponse.json({
    ok: true,
    booking,
    chargeId: booking.chargeId ?? null,
    feeAmount: booking.feeAmount ?? 0,
    paymentRequired: needsPayment,
  });
}
