import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { sendPushToUser } from "@/lib/server/push";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.email.toLowerCase();
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
    select: { commsPush: true },
  });
  const tokenCount = await prisma.expoPushToken.count({
    where: { userEmail: email },
  });
  return NextResponse.json({
    email,
    commsPush: profile?.commsPush ?? false,
    deviceRegistered: tokenCount > 0,
    tokenCount,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok */
  }
  if (body.action !== "test") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  const sent = await sendPushToUser(session.email, {
    title: "The Plaza at Oceanside",
    body: "Test alert — if you see this on your lock screen, push is working.",
    url: "/member/notifications",
  });
  return NextResponse.json({
    ok: sent > 0,
    sent,
    hint:
      sent > 0
        ? "Sent. Check your lock screen."
        : "No phone token on file. Open the Oceanside app, keep Push on, then try again.",
  });
}
