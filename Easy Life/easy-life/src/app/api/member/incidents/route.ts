import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireMember, unitFor } from "@/lib/server/resident-ops";

const CATEGORIES = new Set(["noise", "leak", "damage", "parking", "other"]);

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.residentIncident.findMany({
    where: { communityId: session.communityId!, memberEmail: session.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({
    incidents: rows.map((row) => ({
      id: row.id,
      category: row.category,
      description: row.description,
      status: row.status,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { category?: string; description?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const category = body.category ?? "";
  const description = body.description?.trim() ?? "";
  if (!CATEGORIES.has(category) || description.length < 8 || description.length > 2000) {
    return NextResponse.json({ error: "Describe what happened" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.residentIncident.create({
    data: {
      communityId: session.communityId!,
      memberEmail: email,
      memberName: session.name,
      unit: await unitFor(email),
      category,
      description,
    },
  });
  return NextResponse.json({
    ok: true,
    incident: {
      id: row.id,
      category: row.category,
      description: row.description,
      status: row.status,
    },
  });
}
