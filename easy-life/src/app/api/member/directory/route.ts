import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

/** Directory of community members for event / booking invites. */
export async function GET() {
  const session = await getSession();
  if (
    !session ||
    !["member", "board", "pm", "provider", "admin"].includes(session.role)
  ) {
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
    take: 200,
  });
  return NextResponse.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
    })),
  });
}
