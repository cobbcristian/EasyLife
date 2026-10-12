import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { prisma } from "@/lib/server/prisma";

/** Community member directory for activity invites (mobile bearer). */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const communityId = session.communityId;
  const users = await prisma.user.findMany({
    where: {
      communityId,
      role: { in: ["member", "board", "pm"] },
      NOT: { email: session.email },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 40,
  });
  return NextResponse.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
  });
}
