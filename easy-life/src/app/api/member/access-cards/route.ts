import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireMember, unitFor } from "@/lib/server/resident-ops";

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.accessCardRequest.findMany({
    where: { communityId: session.communityId!, memberEmail: session.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    requests: rows.map((row) => ({
      id: row.id,
      quantity: row.quantity,
      reason: row.reason,
      status: row.status,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { quantity?: number; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const quantity = Number(body.quantity);
  const reason = body.reason?.trim() ?? "";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5 || reason.length < 2 || reason.length > 300) {
    return NextResponse.json({ error: "Say how many cards and why" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.accessCardRequest.create({
    data: {
      communityId: session.communityId!,
      memberEmail: email,
      memberName: session.name,
      unit: await unitFor(email),
      quantity,
      reason,
    },
  });
  return NextResponse.json({
    ok: true,
    request: { id: row.id, quantity: row.quantity, reason: row.reason, status: row.status },
  });
}
