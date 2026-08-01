import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getSession } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = session.communityId ?? "golden-ocala";
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const includeUnpublished = searchParams.get("includeUnpublished") === "true";

  const where: Record<string, unknown> = { communityId };

  if (!includeUnpublished || session.role === "member") {
    where.published = true;
  }

  if (category) {
    where.category = category;
  }

  let articles = await prisma.knowledgeArticle.findMany({
    where,
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { question: "asc" }],
  });

  if (search) {
    const searchLower = search.toLowerCase();
    articles = articles.filter(
      (a) =>
        a.question.toLowerCase().includes(searchLower) ||
        a.answer.toLowerCase().includes(searchLower) ||
        a.keywords.toLowerCase().includes(searchLower)
    );
  }

  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { category, question, answer, keywords, sortOrder, published } = body;

  if (!category || !question || !answer) {
    return NextResponse.json(
      { error: "category, question, and answer are required" },
      { status: 400 }
    );
  }

  const communityId = session.communityId ?? "golden-ocala";

  const article = await prisma.knowledgeArticle.create({
    data: {
      communityId,
      category,
      question,
      answer,
      keywords: keywords ?? "",
      sortOrder: sortOrder ?? 0,
      published: published ?? true,
      createdBy: session.name,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
