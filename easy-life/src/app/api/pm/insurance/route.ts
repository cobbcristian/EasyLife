import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { requireStaffCommunity } from "@/lib/server/resident-ops";

export async function GET() {
  const staff = await requireStaffCommunity();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.residentInsurance.findMany({
    where: { communityId: staff.communityId },
    orderBy: { expiresOn: "asc" },
    take: 200,
  });
  return NextResponse.json({
    policies: rows.map((row) => ({
      id: row.id,
      memberName: row.memberName,
      unit: row.unit,
      kind: row.kind,
      carrier: row.carrier,
      policyNumber: row.policyNumber,
      expiresOn: row.expiresOn,
    })),
  });
}
