import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { appPath } from "@/lib/server/app-url";
import { sendEmail, isEmailConfigured, emailNotConfiguredMessage } from "@/lib/server/notify";
import { prisma } from "@/lib/server/prisma";
import { logEvent } from "@/lib/server/records";

/** Invite a member by email — shares community invite code + join link. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const community = await prisma.community.findUnique({
    where: { id: session.communityId },
    select: { id: true, name: true, inviteCode: true },
  });
  if (!community?.inviteCode) {
    return NextResponse.json(
      { error: "This community has no invite code yet." },
      { status: 400 },
    );
  }

  const joinUrl = appPath(
    `/register?mode=join&communityId=${encodeURIComponent(community.id)}&code=${encodeURIComponent(community.inviteCode)}&email=${encodeURIComponent(email)}`,
  );

  if (!isEmailConfigured()) {
    return NextResponse.json({
      ok: true,
      emailed: false,
      inviteCode: community.inviteCode,
      joinUrl,
      warning: emailNotConfiguredMessage(),
    });
  }

  const greeting = body.name?.trim() ? `Hi ${body.name.trim()},` : "Hi,";
  const result = await sendEmail({
    to: email,
    subject: `You're invited to join ${community.name}`,
    body: [
      greeting,
      "",
      `${session.name} invited you to join ${community.name}.`,
      "",
      `Join here: ${joinUrl}`,
      `Invite code: ${community.inviteCode}`,
      "",
      "Create your account with this email, then sign in to the member portal.",
    ].join("\n"),
  });

  await logEvent({
    communityId: community.id,
    userName: session.name,
    action: "Member invite",
    detail: email,
  });

  return NextResponse.json({
    ok: true,
    emailed: result.ok,
    inviteCode: community.inviteCode,
    joinUrl,
    error: result.error,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || !["admin", "board", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const community = await prisma.community.findUnique({
    where: { id: session.communityId },
    select: { id: true, name: true, inviteCode: true },
  });
  return NextResponse.json({
    communityId: community?.id,
    communityName: community?.name,
    inviteCode: community?.inviteCode ?? null,
    joinBaseUrl: community?.inviteCode
      ? appPath(
          `/register?mode=join&communityId=${encodeURIComponent(community.id)}&code=${encodeURIComponent(community.inviteCode)}`,
        )
      : null,
  });
}
