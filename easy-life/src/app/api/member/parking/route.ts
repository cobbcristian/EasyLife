import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { isDay, requireMember, unitFor } from "@/lib/server/resident-ops";

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.parkingPass.findMany({
    where: { communityId: session.communityId!, memberEmail: session.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({
    passes: rows.map((row) => ({
      id: row.id,
      guestName: row.guestName,
      plate: row.plate,
      date: row.date,
      status: row.status,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { guestName?: string; plate?: string; date?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const guestName = body.guestName?.trim() ?? "";
  const plate = body.plate?.trim().toUpperCase() ?? "";
  const date = body.date?.trim() ?? "";
  if (guestName.length < 2 || guestName.length > 80 || plate.length < 2 || plate.length > 12 || !isDay(date)) {
    return NextResponse.json({ error: "Add the guest, plate, and date" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.parkingPass.create({
    data: {
      communityId: session.communityId!,
      memberEmail: email,
      memberName: session.name,
      unit: await unitFor(email),
      guestName,
      plate,
      date,
    },
  });
  return NextResponse.json({
    ok: true,
    pass: { id: row.id, guestName: row.guestName, plate: row.plate, date: row.date, status: row.status },
  });
}
