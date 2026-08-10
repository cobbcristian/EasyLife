import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  joinAdditionalCommunity,
  listUserMemberships,
} from "@/lib/server/memberships";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await listUserMemberships(session.sub);
  return NextResponse.json({
    memberships,
    activeCommunityId: session.communityId ?? null,
  });
}

/** Join another community with invite code (same login, no second account). */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { communityId?: string; inviteCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.communityId?.trim()) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const result = await joinAdditionalCommunity({
    userId: session.sub,
    communityId: body.communityId.trim(),
    inviteCode: body.inviteCode,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const memberships = await listUserMemberships(session.sub);
  return NextResponse.json({ ok: true, memberships });
}
