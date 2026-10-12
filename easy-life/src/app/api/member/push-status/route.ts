import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { sendExpoPushToUser } from "@/lib/server/expo-push";

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
  const delivery = await sendExpoPushToUser(session.email, {
    title: "Barnaby",
    body: "New alert from Barnaby.",
    url: "/member/notifications",
  });
  const hints: Record<string, string> = {
    no_device:
      "No iPhone or iPad is connected. Install Barnaby 1.0.1 (33) from TestFlight on each device, allow notifications, then turn Push on.",
    DeviceNotRegistered:
      "This device’s alert connection expired. Open Barnaby, turn Push off and on, then try again.",
    InvalidCredentials:
      "Apple rejected the alert. The app build is missing a valid push key.",
  };
  return NextResponse.json({
    ok: delivery.sent > 0,
    sent: delivery.sent,
    hint:
      delivery.sent > 0
        ? "Sent. It shows on the iPhone lock screen, a paired Apple Watch, and an iPad that has Barnaby installed and signed in."
        : (hints[delivery.error ?? ""] ??
          "The alert could not be delivered. Open Barnaby and turn Push off and on, then try again."),
  });
}
