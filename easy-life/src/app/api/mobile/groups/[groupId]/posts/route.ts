import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  addGroupPostComment,
  createGroupPost,
  listGroupPosts,
  toggleGroupPostLike,
} from "@/lib/server/project-management";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { groupId } = await params;
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
      return NextResponse.json({ ok: true, post });
    }
    case "like": {
      if (!body.postId) {
        return NextResponse.json({ error: "postId required" }, { status: 400 });
      }
      const result = await toggleGroupPostLike({
        postId: body.postId,
        memberEmail: session.email,
      });
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
      });
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
