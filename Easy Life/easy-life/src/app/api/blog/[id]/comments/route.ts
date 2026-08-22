import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  addBlogComment,
  listBlogComments,
} from "@/lib/server/member-api-store";
import { prisma } from "@/lib/server/prisma";

async function blogInCommunity(postId: string, communityId?: string | null) {
  const cid = communityId?.trim() || "__missing_community__";
  return prisma.blogPost.findFirst({
    where: { id: postId, communityId: cid },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await blogInCommunity(id, session.communityId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ comments: await listBlogComments(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await blogInCommunity(id, session.communityId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Comment required" }, { status: 400 });
  }

  const comment = await addBlogComment({
    blogId: id,
    author: session.name,
    body: body.body.trim(),
  });

  return NextResponse.json({ ok: true, comment });
}
