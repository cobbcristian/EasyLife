import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getGroupInCommunity, inviteToGroup } from "@/lib/server/member-api-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const group = await getGroupInCommunity(groupId, session.communityId);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const result = await inviteToGroup(groupId, body.email.trim(), session.communityId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    invited: body.email.trim(),
    groupId,
    groupName: group.name,
  });
}
