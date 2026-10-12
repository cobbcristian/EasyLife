import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { sendEmail } from "@/lib/server/notify";
import { sendPushToUser } from "@/lib/server/push";
import {
  createAnnouncement,
  ensureRecordsSeeded,
  listAnnouncements,
  logEvent,
} from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  return NextResponse.json({
    announcements: await listAnnouncements(session.communityId),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    title?: string;
    body?: string;
    priority?: string;
    broadcast?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title || !body.body) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }
  const created = await createAnnouncement({
    communityId: session.communityId,
    title: body.title,
    body: body.body,
    author: session.name,
    priority: body.priority === "important" ? "important" : "normal",
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: body.broadcast ? "Mass announcement" : "Announcement",
    detail: body.title,
  });

  if (body.broadcast && session.communityId) {
    const members = await prisma.user.findMany({
      where: { communityId: session.communityId },
      select: { email: true },
    });
    for (const m of members.slice(0, 50)) {
      await sendEmail({
        to: m.email,
        subject: body.title!,
        body: body.body!,
      });
      try {
        await sendPushToUser(m.email, {
          title: body.title!,
          body: body.body!,
          url: "/member/announcements",
        });
      } catch {
        /* push optional */
      }
    }
  }

  revalidatePath("/member/announcements");
  revalidatePath("/pm/announcements");
  revalidatePath("/board/announcements");
  return NextResponse.json({ ok: true, announcement: created });
}
