import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { isDay, requireMember, unitFor } from "@/lib/server/resident-ops";

const KINDS = new Set(["in", "out"]);
const WINDOWS = new Set(["morning", "afternoon", "evening"]);

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.moveNotice.findMany({
    where: { communityId: session.communityId!, memberEmail: session.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    notices: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      date: row.date,
      window: row.window,
      company: row.company,
      status: row.status,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { kind?: string; date?: string; window?: string; company?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body.kind ?? "";
  const date = body.date?.trim() ?? "";
  const window = body.window ?? "";
  const company = body.company?.trim().slice(0, 80) ?? "";
  if (!KINDS.has(kind) || !WINDOWS.has(window) || !isDay(date)) {
    return NextResponse.json({ error: "Choose a move type, date, and time of day" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.moveNotice.create({
    data: {
      communityId: session.communityId!,
      memberEmail: email,
      memberName: session.name,
      unit: await unitFor(email),
      kind,
      date,
      window,
      company,
    },
  });
  return NextResponse.json({
    ok: true,
    notice: {
      id: row.id,
      kind: row.kind,
      date: row.date,
      window: row.window,
      company: row.company,
      status: row.status,
    },
  });
}
