import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  addGroupPostComment,
  createGroupPost,
  listGroupPosts,
  toggleGroupPostLike,
} from "@/lib/server/project-management";
import { getGroupInCommunity, isGroupMember } from "@/lib/server/member-api-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const group = await getGroupInCommunity(groupId, session.communityId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (!(await isGroupMember(groupId, session.email))) {
    return NextResponse.json({ error: "Join this group to view posts" }, { status: 403 });
  }
  const posts = await listGroupPosts(groupId, session.email);
  return NextResponse.json({ posts });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
  const group = await getGroupInCommunity(groupId, session.communityId);
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (!(await isGroupMember(groupId, session.email))) {
    return NextResponse.json({ error: "Join this group first" }, { status: 403 });
  }
  let body: {
    action?: "create" | "like" | "comment";
    text?: string;
    postId?: string;
    eventId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action ?? "create";
  switch (action) {
    case "create": {
      if (!body.text?.trim()) {
        return NextResponse.json({ error: "Post text required" }, { status: 400 });
      }
      const post = await createGroupPost({
        groupId,
        communityId: session.communityId,
        authorEmail: session.email,
        authorName: session.name,
        body: body.text,
        eventId: body.eventId,
      });
      if (!post) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, post });
    }
    case "like": {
      if (!body.postId) {
        return NextResponse.json({ error: "postId required" }, { status: 400 });
      }
      const result = await toggleGroupPostLike({
        postId: body.postId,
        memberEmail: session.email,
        communityId: session.communityId,
        groupId,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ ok: true, ...result });
    }
    case "comment": {
      if (!body.postId || !body.text?.trim()) {
        return NextResponse.json(
          { error: "postId and text required" },
          { status: 400 },
        );
      }
      const comment = await addGroupPostComment({
        postId: body.postId,
        authorEmail: session.email,
        authorName: session.name,
        body: body.text,
        communityId: session.communityId,
        groupId,
      });
      if (!comment || "error" in comment) {
        return NextResponse.json(
          { error: comment && "error" in comment ? comment.error : "Post not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, comment });
    }
    default: {
      const _exhaustive: never = action;
      return NextResponse.json(
        { error: `Unsupported action: ${_exhaustive}` },
        { status: 400 },
      );
    }
  }
}
