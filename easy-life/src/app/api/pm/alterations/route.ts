import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

const STATUSES = new Set(["submitted", "in_review", "approved", "denied"]);

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin" && session.role !== "board")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const rows = await prisma.architecturalRequest.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({
    requests: rows.map((row) => ({
      id: row.id,
      memberName: row.memberName,
      unit: row.unit,
      title: row.title,
      description: row.description,
      status: row.status,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "pm" && session.role !== "admin" && session.role !== "board")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; status?: string; decisionNote?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Choose a decision" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.architecturalRequest.findFirst({
    where: { id: body.id, communityId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  const row = await prisma.architecturalRequest.update({
    where: { id: existing.id },
    data: {
      status: body.status,
      decisionNote: (body.decisionNote ?? existing.decisionNote).trim().slice(0, 500),
    },
  });
  return NextResponse.json({
    ok: true,
    request: { id: row.id, status: row.status, decisionNote: row.decisionNote },
  });
}
