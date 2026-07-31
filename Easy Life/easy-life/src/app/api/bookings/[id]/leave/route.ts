import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { leaveBookingReservation, logEvent } from "@/lib/server/records";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await leaveBookingReservation(id, session.email);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ("error" in result && result.error === "host_cannot_leave") {
    return NextResponse.json(
      { error: "Hosts should cancel the reservation instead of leaving." },
      { status: 400 },
    );
  }
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Left reservation",
    detail: id,
  });
  revalidatePath("/member/calendar");
  revalidatePath("/member/bookings");
  revalidatePath(`/member/reservations/${id}`);
  revalidatePath("/member/notifications");
  return NextResponse.json({ ok: true });
}
