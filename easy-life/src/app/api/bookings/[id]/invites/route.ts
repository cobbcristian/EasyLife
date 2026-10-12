import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createBookingInvites } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let invites: Array<{ email: string; name: string }> = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.invites)) {
      invites = body.invites
        .map((i: { email?: string; name?: string }) => ({
          email: String(i.email ?? "").trim(),
          name: String(i.name ?? "").trim() || String(i.email ?? "").trim(),
        }))
        .filter((i: { email: string }) => i.email.includes("@"));
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (invites.length === 0) {
    return NextResponse.json({ error: "Invite at least one member" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.memberEmail.trim().toLowerCase() !== session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Only the host can invite" }, { status: 403 });
  }

  const rows = await createBookingInvites({
    bookingId: booking.id,
    amenity: booking.amenity,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    hostName: booking.memberName,
    inviteCapacity: booking.inviteCapacity,
    invites,
  });

  revalidatePath("/member/calendar");
  revalidatePath(`/member/reservations/${id}`);
  revalidatePath("/member/notifications");
  return NextResponse.json({ ok: true, count: rows.length });
}
