import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listWebsitePages,
  upsertWebsitePage,
  publishClubWebsite,
  getPublishedWebsite,
} from "@/lib/server/website-builder";

export async function GET() {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId ?? "golden-ocala";
  const pages = await listWebsitePages(communityId);
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId ?? "golden-ocala";
  let body: {
    action?: "publish" | "save";
    published?: boolean;
    id?: string;
    slug?: string;
    title?: string;
    sortOrder?: number;
    blocks?: { type: string; props: Record<string, unknown> }[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "publish") {
    const result = await publishClubWebsite(
      communityId,
      body.published ?? true,
    );
    return NextResponse.json(result);
  }

  if (!body.slug || !body.title) {
    return NextResponse.json({ error: "slug and title required" }, { status: 400 });
  }

  const page = await upsertWebsitePage({
    id: body.id,
    communityId,
    slug: body.slug,
    title: body.title,
    published: body.published,
    sortOrder: body.sortOrder,
    blocks: (body.blocks ?? []) as Parameters<typeof upsertWebsitePage>[0]["blocks"],
  });
  return NextResponse.json({ page });
}
