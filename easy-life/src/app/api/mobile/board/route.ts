import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { prisma } from "@/lib/server/prisma";

/** Board / management directory for the member's community. */
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
      role: { in: ["board", "pm", "admin"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    })),
  });
}
