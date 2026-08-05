import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listStaffMessageRecipients } from "@/lib/server/records";

function canStaffMessage(role: string): boolean {
  return role === "admin" || role === "pm" || role === "board";
}

/** Active community accounts staff can DM (directory opt-out ignored). */
export async function GET() {
  const session = await getSession();
  if (!session || !canStaffMessage(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const directory = await listStaffMessageRecipients(session.communityId);
  return NextResponse.json({ directory });
}
