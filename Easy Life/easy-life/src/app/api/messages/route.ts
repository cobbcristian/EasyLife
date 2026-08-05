import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import {
  createPrivateMessage,
  ensureRecordsSeeded,
  listPrivateMessages,
  logEvent,
} from "@/lib/server/records";

const CHANNEL_ROLES: Record<string, string[]> = {
  board: ["board", "admin"],
  pm: ["pm", "board", "admin"],
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channel = new URL(request.url).searchParams.get("channel") ?? "board";
  const allowed = CHANNEL_ROLES[channel];
  if (!allowed?.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  try {
    await ensureFourClubDemoContent("full", session.communityId, session.email);
  } catch (err) {
    console.error("[api/messages] four-club seed failed", err);
  }
  const messages = await listPrivateMessages(channel, session.communityId);
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      author: m.author,
      body: m.body,
      time: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { channel?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const channel = body.channel ?? "board";
  const allowed = CHANNEL_ROLES[channel];
  if (!allowed?.includes(session.role) || !body.body?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const msg = await createPrivateMessage({
    communityId: session.communityId,
    channel,
    author: session.name,
    authorEmail: session.email,
    body: body.body.trim(),
  });
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Private message",
    detail: `${channel}: ${body.body.slice(0, 60)}`,
  });
  revalidatePath(channel === "pm" ? "/pm/messages" : "/board/messages");
  return NextResponse.json({
    ok: true,
    message: { id: msg.id, author: msg.author, body: msg.body, time: msg.createdAt.toISOString() },
  });
}
