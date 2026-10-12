import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import {
  createCheckin,
  ensureRecordsSeeded,
  logEvent,
} from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const host = session.name.trim();
  const visitors = await prisma.checkin.findMany({
    where: {
      communityId: session.communityId ?? undefined,
      type: "guest",
      host,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return NextResponse.json({
    visitors: visitors.map((v) => ({
      id: v.id,
      name: v.name,
      unit: v.unit,
      status: v.status,
      createdAt: v.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Visitor name required" }, { status: 400 });
  }

  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: session.email.toLowerCase() },
    select: { unit: true },
  });

  const checkin = await createCheckin({
    communityId: session.communityId,
    name,
    type: "guest",
    host: session.name,
    unit: profile?.unit ?? "—",
    status: "expected",
  });

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Visitor registered",
    detail: `${name} · host ${session.name}`,
  });

  revalidatePath("/pm/front-desk");
  revalidatePath("/pm");
  revalidatePath("/member/visitors");

  return NextResponse.json({
    ok: true,
    visitor: {
      id: checkin.id,
      name: checkin.name,
      unit: checkin.unit,
      status: checkin.status,
      createdAt: checkin.createdAt.toISOString(),
    },
  });
}
