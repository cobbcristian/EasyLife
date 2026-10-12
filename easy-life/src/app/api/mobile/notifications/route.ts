import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  ensureSeedMemberInbox,
  listMemberInbox,
} from "@/lib/server/project-management";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
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
