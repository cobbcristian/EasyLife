import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { logEvent } from "@/lib/server/records";
import { addMemberInboxItem } from "@/lib/server/project-management";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Contact Us",
    detail: `${body.subject ?? "General"}: ${body.message.trim().slice(0, 120)}`,
  });
  await addMemberInboxItem({
    userEmail: session.email,
    title: "We received your message",
    body: "Club management will follow up soon.",
    href: "/member",
  });
  return NextResponse.json({ ok: true });
}
