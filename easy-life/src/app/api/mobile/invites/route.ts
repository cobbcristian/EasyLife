import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  listBookingInvitesForMember,
  listOpenEventInvitesForMember,
} from "@/lib/server/records";

/** Pending event + amenity booking invites that have not ended. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.email.trim().toLowerCase();

  const [eventRows, bookingInvites] = await Promise.all([
    listOpenEventInvitesForMember(email),
    listBookingInvitesForMember(email),
  ]);

  return NextResponse.json({
    invites: [...bookingInvites, ...eventRows].sort((a, b) =>
      (b.date || "").localeCompare(a.date || ""),
    ),
  });
}
