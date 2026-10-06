import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";

const STATUSES = new Set(["reviewing", "closed"]);

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.residentIncident.findMany({
    where: { communityId: staff.communityId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    incidents: rows.map((row) => ({
      id: row.id,
      memberName: row.memberName,
      unit: row.unit,
      category: row.category,
      description: row.description,
      status: row.status,
    })),
  });
}

export async function PATCH(request: Request) {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: string; status?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Choose a status" }, { status: 400 });
  }
  const existing = await prisma.residentIncident.findFirst({
    where: { id: body.id, communityId: staff.communityId },
  });
  if (!existing) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const row = await prisma.residentIncident.update({
    where: { id: existing.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, incident: { id: row.id, status: row.status } });
}
