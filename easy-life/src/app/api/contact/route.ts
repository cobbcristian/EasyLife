import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { createContactMessage, logEvent } from "@/lib/server/records";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { recipient?: string; subject?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.recipient || !body.subject || !body.message) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const msg = await createContactMessage({
    communityId: session.communityId,
    senderName: session.name,
    senderEmail: session.email,
    recipient: body.recipient,
    subject: body.subject,
    message: body.message,
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Contact message",
    detail: `${body.recipient}: ${body.subject}`,
  });
  return NextResponse.json({ ok: true, message: msg });
}
