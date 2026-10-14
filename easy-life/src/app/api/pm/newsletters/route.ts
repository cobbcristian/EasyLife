import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { prisma } from "@/lib/server/prisma";

function canEdit(role: string | undefined) {
  return role === "admin" || role === "pm" || role === "board";
}

export async function GET() {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const rows = await prisma.newsletter.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    newsletters: rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      date: row.createdAt.toISOString().slice(0, 10),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { title?: string; summary?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const title = body.title?.trim() ?? "";
  const summary = body.summary?.trim() ?? "";
  const text = body.body?.trim() ?? "";
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json({ error: "Title must be 2 to 120 characters" }, { status: 400 });
  }
  if (summary.length < 2 || summary.length > 400) {
    return NextResponse.json({ error: "Summary must be 2 to 400 characters" }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Newsletter is too long" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const row = await prisma.newsletter.create({
    data: { communityId, title, summary, body: text || summary },
  });
  const members = await prisma.user.findMany({
    where: { communityId, role: "member", status: "active" },
    select: { email: true },
    take: 300,
  });
  if (members.length > 0) {
    await prisma.memberInboxItem.createMany({
      data: members.map((member) => ({
        userEmail: member.email.trim().toLowerCase(),
        title: "Newsletter",
        body: title,
        href: "/member/newsletter",
      })),
    });
  }
  revalidatePath("/member/newsletter");
  revalidatePath("/pm/newsletter");
  return NextResponse.json({
    ok: true,
    newsletter: {
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      date: row.createdAt.toISOString().slice(0, 10),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; title?: string; summary?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Newsletter is required" }, { status: 400 });
  const title = body.title?.trim() ?? "";
  const summary = body.summary?.trim() ?? "";
  const text = body.body?.trim() ?? "";
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json({ error: "Title must be 2 to 120 characters" }, { status: 400 });
  }
  if (summary.length < 2 || summary.length > 400) {
    return NextResponse.json({ error: "Summary must be 2 to 400 characters" }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Newsletter is too long" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.newsletter.findFirst({
    where: { id: body.id, communityId },
  });
  if (!existing) return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
  const row = await prisma.newsletter.update({
    where: { id: existing.id },
    data: { title, summary, body: text || summary },
  });
  revalidatePath("/member/newsletter");
  return NextResponse.json({
    ok: true,
    newsletter: {
      id: row.id,
      title: row.title,
      summary: row.summary,
      body: row.body,
      date: row.createdAt.toISOString().slice(0, 10),
    },
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Newsletter is required" }, { status: 400 });
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.newsletter.findFirst({
    where: { id: body.id, communityId },
  });
  if (!existing) return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
  await prisma.newsletter.delete({ where: { id: existing.id } });
  revalidatePath("/member/newsletter");
  return NextResponse.json({ ok: true });
}
