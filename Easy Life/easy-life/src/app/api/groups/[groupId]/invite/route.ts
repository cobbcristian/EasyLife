import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { inviteToGroup } from "@/lib/server/member-api-store";
import { prisma } from "@/lib/server/prisma";
import { isSuperAdmin } from "@/lib/server/community-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  if (
    !isSuperAdmin(session) &&
    (!session.communityId || group.communityId !== session.communityId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  await inviteToGroup(groupId, body.email.trim());

  return NextResponse.json({
    ok: true,
    invited: body.email.trim(),
    groupId,
    groupName: group.name,
  });
}
