import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getCommunityById } from "@/lib/server/db";
import { ensureRecordsSeeded, listMemberCharges } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();

  const charges = await listMemberCharges({
    communityId: session.communityId,
    memberEmail: session.email,
  });

  const community =
    session.communityId != null ? await getCommunityById(session.communityId) : null;

  return NextResponse.json({ charges, communityName: community?.name ?? "Community" });
}
