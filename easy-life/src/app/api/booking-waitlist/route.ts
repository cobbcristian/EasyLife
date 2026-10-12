import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  joinBookingWaitlist,
  listWaitlistForMember,
  cancelWaitlistEntry,
} from "@/lib/server/booking-waitlist";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await listWaitlistForMember(session.email);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: {
    waitlistKind?: "amenity" | "dining";
    amenityId?: string;
    amenity: string;
    restaurant?: string;
    date: string;
    startTime: string;
    endTime?: string;
    partySize?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.amenity || !body.date || !body.startTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const communityId = session.communityId ?? "golden-ocala";
  const entry = await joinBookingWaitlist({
    communityId,
    memberEmail: session.email,
    memberName: session.name,
    ...body,
  });
  return NextResponse.json({ entry });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await cancelWaitlistEntry(id, session.email);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
