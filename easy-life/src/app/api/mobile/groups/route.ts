import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  createCommunityGroup,
  listGroupsForMember,
  toggleGroupMembership,
} from "@/lib/server/member-api-store";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const groups = await listGroupsForMember(session.email, session.communityId);
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    groupId?: string;
    name?: string;
    description?: string;
    action?: "join" | "leave" | "create";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.name || body.action === "create") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    const group = await createCommunityGroup({
      communityId: session.communityId,
      name: body.name.trim(),
      description: body.description,
      ownerEmail: session.email,
    });
    return NextResponse.json({ ok: true, group });
  }

  if (!body.groupId) {
    return NextResponse.json({ error: "Group ID required" }, { status: 400 });
  }
  const group = await toggleGroupMembership(session.email, body.groupId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, group });
}
