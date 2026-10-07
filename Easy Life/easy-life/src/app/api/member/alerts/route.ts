import { NextResponse } from "next/server";
import { requireMember } from "@/lib/server/resident-ops";
import { listActiveAlerts } from "@/lib/server/community-alerts";

export async function GET() {
  const session = await requireMember();
  if (!session?.communityId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await listActiveAlerts(session.communityId);
  return NextResponse.json({
    alerts: rows.map((row) => ({
      id: row.id,
      message: row.message,
      detail: row.detail,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
