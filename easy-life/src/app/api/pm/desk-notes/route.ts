import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin" && session.role !== "board")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const notes = await prisma.frontDeskInstruction.findMany({
    where: { communityId, active: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    notes: notes.map((note) => ({
      id: note.id,
      memberName: note.memberName,
      unit: note.unit,
      topic: note.topic,
      note: note.note,
      updatedAt: note.updatedAt.toISOString(),
    })),
  });
}
