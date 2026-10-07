import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";
import { tournamentsEnabledFor } from "@/lib/server/community-flags";

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff?.communityId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const enabled = await tournamentsEnabledFor(staff.communityId);
  return NextResponse.json({ enabled });
}

export async function PATCH(request: Request) {
  const staff = await requireStaffCommunity();
  if (!staff?.communityId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { enabled?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Choose on or off" }, { status: 400 });
  }
  const existing = await prisma.community.findUnique({
    where: { id: staff.communityId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Community not found" }, { status: 404 });
  await prisma.community.update({
    where: { id: existing.id },
    data: { tournamentsEnabled: body.enabled },
  });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
