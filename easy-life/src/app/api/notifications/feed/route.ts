import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listNotificationFeed } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const communityId = await resolveScopedCommunityId(session);
  return NextResponse.json({ notifications: await listNotificationFeed(communityId) });
}
