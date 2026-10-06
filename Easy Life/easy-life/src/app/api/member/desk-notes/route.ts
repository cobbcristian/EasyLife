import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const TOPICS = new Set(["packages", "access", "pets", "other"]);

async function memberUnit(email: string): Promise<string> {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
    select: { unit: true },
  });
  return profile?.unit ?? "";
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "member" || !session.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notes = await prisma.frontDeskInstruction.findMany({
    where: { communityId: session.communityId, memberEmail: session.email.toLowerCase() },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    notes: notes.map((note) => ({
      id: note.id,
      topic: note.topic,
      note: note.note,
      active: note.active,
      updatedAt: note.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member" || !session.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { topic?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const topic = body.topic ?? "other";
  const note = body.note?.trim() ?? "";
  if (!TOPICS.has(topic) || note.length < 2 || note.length > 500) {
    return NextResponse.json({ error: "Add a short instruction" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.frontDeskInstruction.create({
    data: {
      communityId: session.communityId,
      memberEmail: email,
      memberName: session.name,
      unit: await memberUnit(email),
      topic,
      note,
    },
  });
  return NextResponse.json({
    ok: true,
    note: {
      id: row.id,
      topic: row.topic,
      note: row.note,
      active: row.active,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
