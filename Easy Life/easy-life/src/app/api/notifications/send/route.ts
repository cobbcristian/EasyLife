import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { sendEmail } from "@/lib/server/notify";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { to?: string; subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.to || !body.subject) {
    return NextResponse.json(
      { error: "Recipient and subject are required" },
      { status: 400 },
    );
  }

  const to = body.to.trim().toLowerCase();
  if (!isSuperAdmin(session)) {
    if (!session.communityId) {
      return NextResponse.json({ error: "No club on session" }, { status: 400 });
    }
    const recipient = await prisma.user.findUnique({
      where: { email: to },
      select: { id: true, communityId: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found in this club" }, { status: 404 });
    }
    const inClub =
      recipient.communityId === session.communityId ||
      (await prisma.userCommunity.findFirst({
        where: {
          userId: recipient.id,
          communityId: session.communityId,
          status: "active",
        },
        select: { id: true },
      }));
    if (!inClub) {
      return NextResponse.json({ error: "Recipient not found in this club" }, { status: 404 });
    }
  }

  const result = await sendEmail({
    to,
    subject: body.subject,
    body: body.body ?? "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
