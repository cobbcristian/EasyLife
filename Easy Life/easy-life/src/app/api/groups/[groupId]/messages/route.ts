import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { createGroupMessage, ensureRecordsSeeded, listGroupMessages } from "@/lib/server/records";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  await ensureRecordsSeeded();
  const messages = await listGroupMessages(groupId, session.communityId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  const message = await createGroupMessage({
    communityId: session.communityId,
    groupId,
    author: session.name,
    body: body.body.trim(),
  });
  return NextResponse.json({ ok: true, message });
}
