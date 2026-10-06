import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.lostFoundItem.findMany({
    where: { communityId: staff.communityId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      reporterName: row.reporterName,
      kind: row.kind,
      title: row.title,
      detail: row.detail,
      location: row.location,
      status: row.status,
    })),
  });
}

export async function PATCH(request: Request) {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Choose an item" }, { status: 400 });
  const existing = await prisma.lostFoundItem.findFirst({
    where: { id: body.id, communityId: staff.communityId },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const row = await prisma.lostFoundItem.update({
    where: { id: existing.id },
    data: { status: "closed" },
  });
  return NextResponse.json({ ok: true, item: { id: row.id, status: row.status } });
}
