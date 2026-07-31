import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { cancelBooking } from "@/lib/server/records";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await cancelBooking(id, session.email);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/member/bookings");
  revalidatePath("/member/calendar");
  revalidatePath(`/member/reservations/${id}`);
  return NextResponse.json({ ok: true });
}
