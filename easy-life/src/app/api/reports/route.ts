import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, getFinancialReport } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const communityId = await resolveScopedCommunityId(session);
  const report = await getFinancialReport(communityId);
  return NextResponse.json(report);
}
