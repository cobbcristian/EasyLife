import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  buildContactMessageThreads,
} from "@/lib/contact-message-threads";
import {
  createContactMessage,
  ensureRecordsSeeded,
  listContactMessagesForProviderInbox,
  logEvent,
} from "@/lib/server/records";
import { getOrCreateDmThread, postChatMessage } from "@/lib/server/local-pros";

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86_400_000;
  if (diff < dayMs) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diff < dayMs * 2) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatThreadMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86_400_000;
  if (diff < dayMs) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  const rows = await listContactMessagesForProviderInbox(session.email);
  const threads = buildContactMessageThreads(session.email, rows);

  return NextResponse.json({
    threads: threads.map((thread) => ({
      id: thread.id,
      from: thread.counterpartyName,
      counterpartyEmail: thread.counterpartyEmail,
      community: thread.community,
      preview: thread.preview.length > 80 ? `${thread.preview.slice(0, 80)}…` : thread.preview,
      subject: thread.subject,
      time: formatMessageTime(thread.time),
      unread: thread.unread,
      messages: thread.messages.map((m) => ({
        id: m.id,
        body: m.body,
        from: m.from,
        fromEmail: m.fromEmail,
        isMine: m.isMine,
        time: formatThreadMessageTime(m.time),
        unread: m.unread,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    to?: string;
    toEmail?: string;
    subject?: string;
    message?: string;
    threadId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.toEmail || !body.message?.trim()) {
    return NextResponse.json({ error: "Recipient and message required" }, { status: 400 });
  }

  const messageBody = body.message.trim();
  const msg = await createContactMessage({
    communityId: session.communityId,
    senderName: session.name,
    senderEmail: session.email,
    recipient: body.toEmail,
    subject: body.subject ?? `Re: ${body.to ?? "Message"}`,
    message: messageBody,
  });

  // Keep member ChatThread in sync so booking conversation is two-way.
  try {
    const chatThread = await getOrCreateDmThread({
      communityId: session.communityId ?? null,
      fromEmail: session.email,
      fromName: session.name,
      toEmail: body.toEmail,
      toName: body.to || body.toEmail,
    });
    if (chatThread) {
      await postChatMessage(
        {
          threadId: chatThread.id,
          authorEmail: session.email,
          authorName: session.name,
          body: messageBody,
        },
        { bridgeToContact: false },
      );
    }
  } catch {
    // Contact message already saved; chat bridge is best-effort.
  }

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Provider message",
    detail: `To ${body.toEmail}`,
  });
  revalidatePath("/provider/messages");
  return NextResponse.json({
    ok: true,
    threadId: body.threadId,
    message: {
      id: msg.id,
      body: msg.message,
      from: session.name,
      fromEmail: session.email,
      isMine: true,
      time: formatThreadMessageTime(msg.createdAt),
      unread: false,
    },
  });
}
