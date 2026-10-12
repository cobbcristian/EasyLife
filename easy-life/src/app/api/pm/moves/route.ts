import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";

const STATUSES = new Set(["confirmed", "denied"]);

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.moveNotice.findMany({
    where: { communityId: staff.communityId },
    orderBy: { date: "asc" },
    take: 100,
  });
  return NextResponse.json({
    notices: rows.map((row) => ({
      id: row.id,
      memberName: row.memberName,
      unit: row.unit,
      kind: row.kind,
      date: row.date,
      window: row.window,
      company: row.company,
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
    return NextResponse.json({ error: "Choose a decision" }, { status: 400 });
  }
  const existing = await prisma.moveNotice.findFirst({
    where: { id: body.id, communityId: staff.communityId },
  });
  if (!existing) return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  const row = await prisma.moveNotice.update({
    where: { id: existing.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true, notice: { id: row.id, status: row.status } });
}
