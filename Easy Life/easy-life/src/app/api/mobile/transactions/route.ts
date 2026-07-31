import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  ensureRecordsSeeded,
  listBookingsForMember,
  listOrdersForMember,
} from "@/lib/server/records";
import { getCommunityBookings } from "@/lib/communities-data";

/** Member transactions / receipts. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();
  const [bookings, orders, serviceBookings] = await Promise.all([
    listBookingsForMember(session.email),
    listOrdersForMember(session.email),
    Promise.resolve(
      getCommunityBookings(session.communityId).filter(
        (b) => b.resident.toLowerCase() === session.name.toLowerCase(),
      ),
    ),
  ]);

  const rows = [
    ...orders.map((o) => ({
      id: `o-${o.id}`,
      title: o.items.slice(0, 48),
      amount: o.total,
      date: o.createdAt.toISOString().slice(0, 10),
      status: o.status,
      kind: "food" as const,
    })),
    ...serviceBookings.map((b) => ({
      id: `s-${b.id}`,
      title: b.service,
      amount: b.amount,
      date: b.date,
      status: b.status,
      kind: "service" as const,
    })),
    ...bookings.map((b) => ({
      id: `b-${b.id}`,
      title: b.amenity,
      amount: 0,
      date: b.date,
      status: b.status,
      kind: "booking" as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ transactions: rows });
}
