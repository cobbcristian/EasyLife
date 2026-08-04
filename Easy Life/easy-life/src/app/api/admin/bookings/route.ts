import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  canStaffBookForMembers,
  canStaffBookInCommunity,
  isSuperAdmin,
  resolveScopedCommunityId,
} from "@/lib/server/community-context";
import {
  BookingConflictError,
  createBooking,
  ensureRecordsSeeded,
  listAmenities,
  logEvent,
  MembershipAccessError,
} from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import { parseBody, adminBookingSchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !canStaffBookForMembers(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();

  const { searchParams } = new URL(request.url);
  const requestedCommunityId = searchParams.get("communityId");
  let communityId = await resolveScopedCommunityId(session);
  if (isSuperAdmin(session) && requestedCommunityId) {
    communityId = requestedCommunityId;
  }
  if (!canStaffBookInCommunity(session, communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [amenities, members, bookings, communities] = await Promise.all([
    listAmenities(communityId),
    prisma.user.findMany({
      where: { communityId, role: "member" },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, email: true },
    }),
    prisma.booking.findMany({
      where: { communityId, status: { not: "cancelled" } },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 100,
    }),
    isSuperAdmin(session)
      ? prisma.community.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    communityId,
    communities,
    amenities: amenities.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      playable: a.playable,
      unitCount: a.unitCount,
    })),
    members,
    bookings: bookings.map((b) => ({
      id: b.id,
      amenity: b.amenity,
      memberName: b.memberName,
      memberEmail: b.memberEmail,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      unitNumber: b.unitNumber,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canStaffBookForMembers(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseBody(adminBookingSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let communityId = await resolveScopedCommunityId(session);
  if (isSuperAdmin(session) && parsed.data.communityId) {
    communityId = parsed.data.communityId;
  }
  if (!canStaffBookInCommunity(session, communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberEmail = parsed.data.memberEmail.trim().toLowerCase();
  const member = await prisma.user.findFirst({
    where: {
      email: memberEmail,
      communityId,
      role: "member",
    },
    select: { name: true, email: true },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Member not found in this community" },
      { status: 404 },
    );
  }

  const memberName =
    parsed.data.memberName?.trim() || member.name || member.email;

  let booking;
  try {
    booking = await createBooking({
      communityId,
      memberEmail: member.email,
      memberName,
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
    communityId,
    userName: session.name,
    action: "Staff booking",
    detail: `${booking.amenity} for ${memberName} (${member.email}) — ${parsed.data.date} ${parsed.data.startTime}–${parsed.data.endTime} (by ${session.email})`,
  });

  revalidatePath("/member/bookings");
  revalidatePath("/member/calendar");
  revalidatePath(`/member/reservations/${booking.id}`);
  revalidatePath("/super-admin/bookings");
  revalidatePath("/pm/bookings");

  return NextResponse.json({ ok: true, booking });
}
