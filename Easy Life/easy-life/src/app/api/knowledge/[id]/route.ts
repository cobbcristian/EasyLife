import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import type { SessionPayload } from "@/lib/types";

function canAccessKnowledgeCommunity(
  session: SessionPayload,
  articleCommunityId: string,
): boolean {
  if (isSuperAdmin(session)) return true;
  return !!session.communityId && session.communityId === articleCommunityId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (!canAccessKnowledgeCommunity(session, article.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!article.published && session.role === "member") {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  await prisma.knowledgeArticle.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json(article);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { category, question, answer, keywords, sortOrder, published } = body;

  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (!canAccessKnowledgeCommunity(session, article.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      ...(category !== undefined && { category }),
      ...(question !== undefined && { question }),
      ...(answer !== undefined && { answer }),
      ...(keywords !== undefined && { keywords }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(published !== undefined && { published }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !["admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const article = await prisma.knowledgeArticle.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  if (!canAccessKnowledgeCommunity(session, article.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.knowledgeArticle.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
