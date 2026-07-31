import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  addBlogComment,
  listBlogComments,
} from "@/lib/server/member-api-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  return NextResponse.json({ comments: await listBlogComments(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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
