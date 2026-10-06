import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

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
  const rows = await prisma.architecturalRequest.findMany({
    where: { communityId: session.communityId, memberEmail: session.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({
    requests: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member" || !session.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { title?: string; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  if (title.length < 3 || title.length > 120 || description.length < 8 || description.length > 2000) {
    return NextResponse.json({ error: "Describe the change you want to make" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.architecturalRequest.create({
    data: {
      communityId: session.communityId,
      memberEmail: email,
      memberName: session.name,
      unit: await memberUnit(email),
      title,
      description,
    },
  });
  return NextResponse.json({
    ok: true,
    request: {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt.toISOString(),
    },
  });
}
