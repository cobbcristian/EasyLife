import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { listChatThreadsForUser } from "@/lib/server/local-pros";
import { listGroupsForMember } from "@/lib/server/member-api-store";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [threads, groups] = await Promise.all([
    listChatThreadsForUser(session.email, session.communityId ?? null),
    listGroupsForMember(session.email, session.communityId),
  ]);

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      preview: t.lastMessage ?? "",
      updatedAt: t.updatedAt,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members,
      joined: g.joined,
    })),
  });
}
