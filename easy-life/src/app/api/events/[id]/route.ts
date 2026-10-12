import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getEventReservationDetail } from "@/lib/server/records";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const detail = await getEventReservationDetail(
    id,
    session.email,
    session.name,
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ reservation: detail });
}
