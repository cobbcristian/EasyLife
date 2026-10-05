import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import {
  listAmenities,
  updateAmenityOperatingHours,
} from "@/lib/server/records";

function canEdit(role: string | undefined) {
  return role === "admin" || role === "pm" || role === "board";
}

export async function GET() {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const amenities = await listAmenities(communityId);
  return NextResponse.json({
    amenities: amenities.map((a) => ({
      id: a.id,
      name: a.name,
      schedule: a.schedule,
      hoursJson: a.hoursJson,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { amenityId?: string; open?: string; close?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const open = body.open?.trim() ?? "";
  const close = body.close?.trim() ?? "";
  if (!body.amenityId || !/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) {
    return NextResponse.json({ error: "Amenity, open, and close are required" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const updated = await updateAmenityOperatingHours({
    amenityId: body.amenityId,
    communityId,
    open,
    close,
  });
  if (!updated) {
    return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  }
  revalidatePath("/member/hours");
  revalidatePath("/member/bookings");
  revalidatePath("/pm/amenities");
  return NextResponse.json({
    ok: true,
    amenity: { id: updated.id, name: updated.name, schedule: updated.schedule },
  });
}
