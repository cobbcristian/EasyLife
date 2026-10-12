import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createBlogPost, ensureRecordsSeeded, listBlogPosts } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  return NextResponse.json({ posts: await listBlogPosts(session.communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; excerpt?: string; body?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title || !body.excerpt) {
    return NextResponse.json({ error: "Title and excerpt required" }, { status: 400 });
  }
  const post = await createBlogPost({
    communityId: session.communityId,
    title: body.title,
    excerpt: body.excerpt,
    body: body.body ?? "",
    author: session.name,
    category: body.category ?? "Community",
  });
  revalidatePath("/member/blog");
  return NextResponse.json({ ok: true, post });
}
