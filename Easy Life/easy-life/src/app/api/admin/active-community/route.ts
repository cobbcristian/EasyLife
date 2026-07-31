import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  ACTIVE_COMMUNITY_COOKIE,
  isSuperAdmin,
} from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { communityId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const exists = await prisma.community.findUnique({
    where: { id: body.communityId },
    select: { id: true, name: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, community: exists });
  response.cookies.set(ACTIVE_COMMUNITY_COOKIE, body.communityId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
