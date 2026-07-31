import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  BookingInviteFullError,
  respondBookingInvite,
} from "@/lib/server/records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let status: "accepted" | "declined" | undefined;
  try {
    const body = await request.json();
    if (body?.status === "accepted" || body?.status === "declined") {
      status = body.status;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!status) {
    return NextResponse.json(
      { error: "status must be accepted or declined" },
      { status: 400 },
    );
  }
  try {
    const updated = await respondBookingInvite({
      inviteId: id,
      memberEmail: session.email,
      status,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, invite: updated });
  } catch (err) {
    if (err instanceof BookingInviteFullError) {
      return NextResponse.json(
        { error: err.message, code: "invite_full" },
        { status: 409 },
      );
    }
    throw err;
  }
}
