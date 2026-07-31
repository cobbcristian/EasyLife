import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  addCommunityBooking,
  getCommunityBookings,
  updateCommunityBookingStatus,
} from "@/lib/communities-data";
import { getCommunityById } from "@/lib/server/db";
import { ensureRecordsSeeded } from "@/lib/server/records";
import type { ServiceBookingStatus } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const community = await getCommunityById(session.communityId);
  const communityName = community?.name ?? "Community";
  const bookings = getCommunityBookings(session.communityId)
    .filter((b) => b.provider === session.name)
    .map((b) => ({
      id: b.id,
      resident: b.resident,
      community: communityName,
      service: b.service,
      date: b.date,
      time: b.endTime ? `${b.time} – ${b.endTime}` : b.time,
      endTime: b.endTime ?? null,
      status: b.status,
      amount: b.amount,
    }));
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  let body: {
    resident?: string;
    services?: string[];
    date?: string;
    time?: string;
    endTime?: string;
    amount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.resident?.trim() || !Array.isArray(body.services) || body.services.length === 0) {
    return NextResponse.json({ error: "resident and services required" }, { status: 400 });
  }

  const service = body.services.join(", ");
  const amount =
    body.amount ??
    body.services.reduce((sum, name) => {
      if (name.includes("Full House")) return sum + 250;
      if (name.includes("Carpet")) return sum + 150;
      return sum + 100;
    }, 0);

  const created = addCommunityBooking({
    communityId: session.communityId,
    resident: body.resident.trim(),
    provider: session.name,
    service,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    time: body.time ?? "10:00 AM",
    endTime: body.endTime?.trim() || undefined,
    status: "pending",
    amount,
  });

  const community = session.communityId
    ? await getCommunityById(session.communityId)
    : undefined;

  return NextResponse.json({
    ok: true,
    booking: {
      id: created.id,
      resident: created.resident,
      community: community?.name ?? "Community",
      service: created.service,
      date: created.date,
      time: created.time,
      endTime: created.endTime ?? null,
      status: created.status,
      amount: created.amount,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; status?: ServiceBookingStatus };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  const updated = updateCommunityBookingStatus(body.id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, booking: updated });
}
