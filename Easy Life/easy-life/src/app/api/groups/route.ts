import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createCommunityGroup,
  listGroupsForMember,
  toggleGroupMembership,
} from "@/lib/server/member-api-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ groups: await listGroupsForMember(session.email, session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { groupId?: string; name?: string; description?: string; action?: "join" | "leave" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.name) {
    const group = await createCommunityGroup({
      communityId: session.communityId,
      name: body.name,
      description: body.description,
      ownerEmail: session.email,
    });
    return NextResponse.json({ ok: true, group });
  }

  if (!body.groupId) {
    return NextResponse.json({ error: "Group ID or name required" }, { status: 400 });
  }

  const group = await toggleGroupMembership(session.email, body.groupId, session.communityId);
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ ok: true, group });
}
