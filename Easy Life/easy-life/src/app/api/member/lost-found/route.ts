import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireMember } from "@/lib/server/resident-ops";

const KINDS = new Set(["lost", "found"]);

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = session.email.toLowerCase();
  const rows = await prisma.lostFoundItem.findMany({
    where: {
      communityId: session.communityId!,
      OR: [{ reporterEmail: email }, { kind: "found", status: "open" }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      detail: row.detail,
      location: row.location,
      status: row.status,
      mine: row.reporterEmail === email,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { kind?: string; title?: string; detail?: string; location?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body.kind ?? "";
  const title = body.title?.trim() ?? "";
  const detail = body.detail?.trim() ?? "";
  const location = body.location?.trim().slice(0, 80) ?? "";
  if (!KINDS.has(kind) || title.length < 2 || title.length > 80 || detail.length < 2 || detail.length > 500) {
    return NextResponse.json({ error: "Describe the item" }, { status: 400 });
  }
  const row = await prisma.lostFoundItem.create({
    data: {
      communityId: session.communityId!,
      reporterEmail: session.email.toLowerCase(),
      reporterName: session.name,
      kind,
      title,
      detail,
      location,
    },
  });
  return NextResponse.json({
    ok: true,
    item: {
      id: row.id,
      kind: row.kind,
      title: row.title,
      detail: row.detail,
      location: row.location,
      status: row.status,
      mine: true,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Choose an item" }, { status: 400 });
  const existing = await prisma.lostFoundItem.findFirst({
    where: {
      id: body.id,
      communityId: session.communityId!,
      kind: "found",
      status: "open",
      reporterEmail: { not: session.email.toLowerCase() },
    },
  });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const row = await prisma.lostFoundItem.update({
    where: { id: existing.id },
    data: { status: "claimed", claimEmail: session.email.toLowerCase() },
  });
  return NextResponse.json({ ok: true, item: { id: row.id, status: row.status } });
}
