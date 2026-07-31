import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listBudgetLines } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || !["board", "admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const lines = await listBudgetLines(session.communityId);
  return NextResponse.json({
    lines: lines.map((l) => ({
      id: l.id,
      category: l.category,
      budgeted: l.budgeted,
      spent: l.spent,
    })),
  });
}
