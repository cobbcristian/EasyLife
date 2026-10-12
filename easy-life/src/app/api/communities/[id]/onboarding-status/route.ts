import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { canManageCommunity } from "@/lib/server/community-context";
import { getCommunityOnboardingReadiness } from "@/lib/server/platform-analytics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: communityId } = await params;
  if (!canManageCommunity(session, communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readiness = await getCommunityOnboardingReadiness(communityId);
  return NextResponse.json(readiness);
}
