import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  ensureSeedMemberInbox,
  listMemberInbox,
  markMemberInboxRead,
} from "@/lib/server/project-management";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let clubName: string | null = null;
  if (session.communityId) {
    const community = await prisma.community.findUnique({
      where: { id: session.communityId },
      select: { appDisplayName: true, name: true },
    });
    clubName = community?.appDisplayName ?? community?.name ?? null;
  }
  await ensureSeedMemberInbox(session.email, clubName);
  const items = await listMemberInbox(session.email);
  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

/** Mark all inbox items read when the member opens Notifications. */
export async function PATCH() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await markMemberInboxRead(session.email);
  return NextResponse.json({ ok: true, updated: result.count });
}
