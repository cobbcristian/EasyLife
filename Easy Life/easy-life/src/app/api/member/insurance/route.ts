import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { isDay, requireMember, unitFor } from "@/lib/server/resident-ops";

const KINDS = new Set(["homeowner", "renters"]);

export async function GET() {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.residentInsurance.findMany({
    where: { communityId: session.communityId!, memberEmail: session.email.toLowerCase() },
    orderBy: { expiresOn: "asc" },
    take: 10,
  });
  return NextResponse.json({
    policies: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      carrier: row.carrier,
      policyNumber: row.policyNumber,
      expiresOn: row.expiresOn,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { kind?: string; carrier?: string; policyNumber?: string; expiresOn?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body.kind ?? "";
  const carrier = body.carrier?.trim() ?? "";
  const policyNumber = body.policyNumber?.trim() ?? "";
  const expiresOn = body.expiresOn?.trim() ?? "";
  if (
    !KINDS.has(kind) ||
    carrier.length < 2 ||
    carrier.length > 80 ||
    policyNumber.length < 2 ||
    policyNumber.length > 40 ||
    !isDay(expiresOn)
  ) {
    return NextResponse.json({ error: "Add the carrier, policy number, and expiration" }, { status: 400 });
  }
  const email = session.email.toLowerCase();
  const row = await prisma.residentInsurance.create({
    data: {
      communityId: session.communityId!,
      memberEmail: email,
      memberName: session.name,
      unit: await unitFor(email),
      kind,
      carrier,
      policyNumber,
      expiresOn,
    },
  });
  return NextResponse.json({
    ok: true,
    policy: {
      id: row.id,
      kind: row.kind,
      carrier: row.carrier,
      policyNumber: row.policyNumber,
      expiresOn: row.expiresOn,
    },
  });
}
