import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  addGroupPostComment,
  addMemberInboxItem,
  createGroupPost,
  listGroupPosts,
  toggleGroupPostLike,
} from "@/lib/server/project-management";
import { addFavorite, getGroupInCommunity, isGroupMember } from "@/lib/server/member-api-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
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
  const session = await getSession();
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
    action?: "create" | "like" | "comment" | "report" | "block";
    text?: string;
    postId?: string;
    eventId?: string | null;
    imageUrl?: string | null;
    reason?: string;
    targetEmail?: string;
    targetName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const action = body.action ?? "create";
  switch (action) {
    case "create": {
      if (!body.text?.trim() && !body.imageUrl?.trim()) {
        return NextResponse.json({ error: "Post text or photo required" }, { status: 400 });
      }
      const post = await createGroupPost({
        groupId,
        communityId: session.communityId,
        authorEmail: session.email,
        authorName: session.name,
        body: body.text?.trim() || "",
        imageUrl: body.imageUrl,
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
    case "report":
    case "block": {
      const label =
        action === "report"
          ? `Report: ${body.targetName || body.postId || "group content"}`
          : `Blocked: ${body.targetName || body.targetEmail || "member"}`;
      const href =
        action === "report"
          ? `report:group:${groupId}:${body.postId ?? "post"}`
          : `block:${(body.targetEmail || body.targetName || "member").trim().toLowerCase()}`;
      await addFavorite(session.email, { label, href });
      await addMemberInboxItem({
        userEmail: session.email,
        title: action === "report" ? "Report submitted" : "Member blocked",
        body:
          body.reason?.trim() ||
          (action === "report"
            ? "Thanks — club moderators can review this."
            : "You won’t see this member in suggestions."),
        href: "/member/groups",
      });
      return NextResponse.json({ ok: true });
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
