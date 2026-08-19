import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { createGroupMessage, ensureRecordsSeeded, listGroupMessages } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";

async function assertGroupAccess(groupId: string, communityId?: string | null) {
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false as const, status: 404 as const, error: "Group not found" };
  if (communityId && group.communityId !== communityId) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true as const, group };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  if (!isSuperAdmin(session)) {
    const access = await assertGroupAccess(groupId, session.communityId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }
  await ensureRecordsSeeded();
  const messages = await listGroupMessages(groupId, session.communityId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  if (!isSuperAdmin(session)) {
    const access = await assertGroupAccess(groupId, session.communityId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  const message = await createGroupMessage({
    communityId: session.communityId,
    groupId,
    author: session.name,
    body: body.body.trim(),
  });
  return NextResponse.json({ ok: true, message });
}
