import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canStaffBookInCommunity } from "@/lib/server/community-context";
import {
  communityIdForServiceBooking,
  updateCommunityBookingStatus,
} from "@/lib/communities-data";
import type { ServiceBookingStatus } from "@/lib/types";

const ALLOWED: ServiceBookingStatus[] = [
  "pending",
  "upcoming",
  "accepted",
  "completed",
  "cancelled",
];

/** Club / platform admin status updates for service & activity bookings. */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: ServiceBookingStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.id || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "id and valid status required" }, { status: 400 });
  }

  const bookingCommunityId = communityIdForServiceBooking(body.id);
  if (!bookingCommunityId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Enforce ownership by the booking's community — do not trust client ids alone.
  if (!canStaffBookInCommunity(session, bookingCommunityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = updateCommunityBookingStatus(body.id, body.status, {
    communityId: bookingCommunityId,
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePath("/pm");
  revalidatePath("/dashboard");
  if (session.communityId) {
    revalidatePath(`/communities/${session.communityId}/bookings`);
  }

  return NextResponse.json({ ok: true, booking: updated });
}
