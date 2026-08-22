import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { isPushConfigured, sendPushToUser } from "@/lib/server/push";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push not configured — set VAPID keys in environment" },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = (body.email ?? session.email).trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Recipient email required" }, { status: 400 });
  }

  if (!isSuperAdmin(session) && email !== session.email.toLowerCase()) {
    if (!session.communityId) {
      return NextResponse.json({ error: "No club on session" }, { status: 400 });
    }
    const recipient = await prisma.user.findUnique({
      where: { email },
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

  const sent = await sendPushToUser(email, {
    title: "Club test notification",
    body: "Push notifications are working on your community platform.",
    url: "/member",
  });

  if (sent === 0) {
    return NextResponse.json(
      {
        error:
          "No active push subscriptions for that user — enable push in member profile first",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, sent });
}
