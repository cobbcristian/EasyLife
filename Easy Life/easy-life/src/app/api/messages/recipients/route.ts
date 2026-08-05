import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { listStaffMessageRecipients } from "@/lib/server/records";

/**
 * Active community accounts anyone in the community can DM.
 * Directory opt-out does not apply — messaging is separate from the public directory.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const directory = await listStaffMessageRecipients(session.communityId);
  return NextResponse.json({ directory });
}
