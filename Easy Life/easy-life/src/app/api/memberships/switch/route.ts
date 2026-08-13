import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  getSession,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { ACTIVE_COMMUNITY_COOKIE } from "@/lib/tenant";
import {
  sessionClaimsForCommunitySwitch,
  switchActiveCommunity,
} from "@/lib/server/memberships";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { communityId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const communityId = body.communityId?.trim();
  if (!communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const result = await switchActiveCommunity({
    userId: session.sub,
    communityId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const claims = sessionClaimsForCommunitySwitch(session, {
    communityId,
    role: result.role,
  });
  const token = await createSessionToken(claims);

  const response = NextResponse.json({
    ok: true,
    communityId,
    role: result.role,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  response.cookies.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
