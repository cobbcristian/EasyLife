import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import {
  createCheckin,
  ensureRecordsSeeded,
  listCheckins,
  logEvent,
  updateCheckinStatus,
} from "@/lib/server/records";
import { parseBody, checkinSchema } from "@/lib/server/validation";
import {
  mergeApprovedBookingsIntoCheckins,
  parseServiceBookingIdFromCheckinId,
  serviceBookingUnit,
} from "@/lib/server/gate-arrivals";
import { getCommunityBookingById } from "@/lib/communities-data";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  try {
    await ensureFourClubDemoContent("full", session.communityId, session.email);
  } catch (err) {
    console.error("[api/checkins] four-club seed failed", err);
  }
  const checkins = await listCheckins(session.communityId);
  const merged = mergeApprovedBookingsIntoCheckins({
    communityId: session.communityId,
    checkins,
  });
  return NextResponse.json({
    checkins: merged.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      host: c.host,
      unit: c.unit,
      time: c.time,
      status: c.status,
      photo: c.photo,
      service: c.service,
      fromBooking: c.fromBooking,
      admitWithoutCall: c.admitWithoutCall,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(checkinSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const checkin = await createCheckin({
    communityId: session.communityId,
    ...parsed.data,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Check-in",
    detail: `${parsed.data.type}: ${parsed.data.name}`,
  });
  revalidatePath("/pm/front-desk");
  revalidatePath("/pm");
  return NextResponse.json({ ok: true, checkin });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "ID and status required" }, { status: 400 });
  }

  const bookingId = parseServiceBookingIdFromCheckinId(body.id);
  if (bookingId) {
    const booking = getCommunityBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const checkin = await createCheckin({
      communityId: session.communityId,
      name: booking.provider,
      type: "vendor",
      host: booking.resident,
      unit: serviceBookingUnit(booking.id),
      status: body.status,
    });
    await logEvent({
      communityId: session.communityId,
      userName: session.name,
      action: body.status === "checked_in" ? "Gate admit (approved booking)" : "Check-in update",
      detail: `${booking.provider} for ${booking.resident} · ${booking.service}`,
    });
    revalidatePath("/pm/front-desk");
    revalidatePath("/pm");
    return NextResponse.json({
      ok: true,
      checkin: {
        id: checkin.id,
        name: checkin.name,
        type: checkin.type,
        host: checkin.host,
        unit: checkin.unit,
        status: checkin.status,
        photo: checkin.photoUrl,
        fromBooking: true,
        admitWithoutCall: true,
        service: booking.service,
      },
    });
  }

  const updated = await updateCheckinStatus(
    body.id,
    body.status,
    session.communityId,
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidatePath("/pm/front-desk");
  revalidatePath("/pm");
  return NextResponse.json({ ok: true });
}
