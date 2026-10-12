import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  checkInMember,
  listRecentCheckIns,
  listMemberCheckIns,
  facilityForBeacon,
} from "@/lib/server/activity-checkin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = session.communityId ?? "golden-ocala";

  if (session.role === "member") {
    const checkIns = await listMemberCheckIns(session.email);
    return NextResponse.json({ checkIns });
  }
  const checkIns = await listRecentCheckIns(communityId);
  return NextResponse.json({ checkIns });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { facility?: string; method?: string; beaconId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let facility = body.facility;
  if (body.beaconId && !facility) {
    facility = facilityForBeacon(body.beaconId) ?? undefined;
  }
  if (!facility) {
    return NextResponse.json({ error: "facility or beaconId required" }, { status: 400 });
  }
  const communityId = session.communityId ?? "golden-ocala";

  const checkIn = await checkInMember({
    communityId,
    memberEmail: session.email,
    memberName: session.name,
    facility,
    method: (body.method as "app" | "beacon" | "manual" | "kiosk") ?? "app",
    beaconId: body.beaconId,
  });
  return NextResponse.json({ checkIn });
}
