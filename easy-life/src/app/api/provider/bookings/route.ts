import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  addCommunityBooking,
  getCommunityBookings,
  updateCommunityBookingStatus,
} from "@/lib/communities-data";
import { getCommunityById } from "@/lib/server/db";
import { ensureRecordsSeeded } from "@/lib/server/records";
import type { ServiceBookingStatus } from "@/lib/types";

function mapBooking(
  b: {
    id: string;
    resident: string;
    service: string;
    date: string;
    time: string;
    endTime?: string;
    status: ServiceBookingStatus;
    amount: number;
    goingCount?: number;
  },
  communityName: string,
) {
  return {
    id: b.id,
    resident: b.resident,
    community: communityName,
    service: b.service,
    date: b.date,
    time: b.endTime ? `${b.time} – ${b.endTime}` : b.time,
    endTime: b.endTime ?? null,
    status: b.status,
    amount: b.amount,
    goingCount: b.goingCount,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const community = await getCommunityById(session.communityId);
  const communityName = community?.name ?? "Community";

  const bookings = getCommunityBookings(session.communityId)
    .filter((b) => b.provider === session.name)
    .map((b) => mapBooking(b, communityName));

  return NextResponse.json({ bookings });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.resident || !Array.isArray(body.services) || body.services.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const community = await getCommunityById(session.communityId);
  const communityName = community?.name ?? "Community";

  const service = (body.services as string[]).join(", ");
  const invitees = Array.isArray(body.invitees)
    ? (body.invitees as Array<{ email?: string; name?: string }>)
    : [];
  const goingFromBody =
    typeof body.goingCount === "number" && body.goingCount > 0
      ? Math.floor(body.goingCount)
      : undefined;
  const goingCount =
    goingFromBody ??
    (invitees.length > 0 ? 1 + invitees.length : undefined);

  const amount = (body.services as string[]).reduce((sum, name) => {
    if (name.includes("Full House")) return sum + 250;
    if (name.includes("Carpet")) return sum + 150;
    if (/court/i.test(name)) return sum + 0;
    return sum + 100;
  }, 0);

  const created = addCommunityBooking({
    communityId: session.communityId,
    resident: String(body.resident),
    provider: session.name,
    service,
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    time: String(body.time || "10:00 AM"),
    endTime: body.endTime ? String(body.endTime) : undefined,
    status: body.status === "accepted" ? "accepted" : "pending",
    amount,
    goingCount,
  });

  return NextResponse.json({ booking: mapBooking(created, communityName) });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const status = body?.status as ServiceBookingStatus | undefined;
  if (!id || !status) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const allowed: ServiceBookingStatus[] = [
    "pending",
    "accepted",
    "upcoming",
    "completed",
    "cancelled",
  ];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = updateCommunityBookingStatus(id, status);
  if (!updated || updated.provider !== session.name) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const community = session.communityId
    ? await getCommunityById(session.communityId)
    : undefined;
  revalidatePath("/pm/front-desk");
  revalidatePath("/pm");
  revalidatePath("/member/calendar");
  return NextResponse.json({
    booking: mapBooking(updated, community?.name ?? "Community"),
  });
}
