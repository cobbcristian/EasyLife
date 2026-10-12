import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  assertChatParticipantInCommunity,
  listChatMessages,
  postChatMessage,
} from "@/lib/server/local-pros";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const membership = await assertChatParticipantInCommunity(
    id,
    session.email,
    session.communityId ?? null,
  );
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await listChatMessages(id);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const membership = await assertChatParticipantInCommunity(
    id,
    session.email,
    session.communityId ?? null,
  );
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = await postChatMessage({
    threadId: id,
    authorEmail: session.email,
    authorName: session.name,
    body: body.body ?? "",
  });
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
  return NextResponse.json({ ok: true, message });
}
