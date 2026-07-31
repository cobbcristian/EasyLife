import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const communityId =
    session.role === "admin"
      ? await resolveScopedCommunityId(session)
      : session.communityId;

  const scope = communityId ? { communityId } : {};

  const [documents, events, members, tournaments] = await Promise.all([
    prisma.communityDocument.findMany({
      where: { ...scope, title: { contains: q } },
      take: 8,
      select: { id: true, title: true, category: true },
    }),
    prisma.communityEvent.findMany({
      where: { ...scope, title: { contains: q } },
      take: 8,
      select: { id: true, title: true, date: true },
    }),
    prisma.user.findMany({
      where: {
        ...scope,
        role: "member",
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, name: true, email: true },
    }),
    session.role === "admin" || session.role === "member"
      ? prisma.tournament.findMany({
          where: { ...scope, title: { contains: q } },
          take: 5,
          select: { id: true, title: true, sport: true, date: true },
        })
      : Promise.resolve([]),
  ]);

  const base =
    session.role === "member"
      ? "/member"
      : session.role === "admin"
        ? ""
        : "";

  const results = [
    ...documents.map((d) => ({
      type: "document" as const,
      id: d.id,
      label: d.title,
      meta: d.category,
      href: `${base}/documents`,
    })),
    ...events.map((e) => ({
      type: "event" as const,
      id: e.id,
      label: e.title,
      meta: e.date,
      href: `${base}/calendar`,
    })),
    ...members.map((m) => ({
      type: "member" as const,
      id: m.id,
      label: m.name,
      meta: m.email,
      href: session.role === "admin" ? "/communities" : `${base}/directory`,
    })),
    ...tournaments.map((t) => ({
      type: "tournament" as const,
      id: t.id,
      label: t.title,
      meta: `${t.sport} · ${t.date}`,
      href: session.role === "member" ? "/member/tournaments" : "/tournaments",
    })),
  ];

  return NextResponse.json({ results: results.slice(0, 12) });
}
