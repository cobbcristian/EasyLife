import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ChatCommunityScopeError } from "@/lib/server/chat-community-scope";
import {
  createGroupChat,
  getOrCreateDmThread,
  listChatThreadsForUser,
} from "@/lib/server/local-pros";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const threads = await listChatThreadsForUser(session.email, session.communityId ?? null);
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    kind?: "dm" | "group";
    title?: string;
    toEmail?: string;
    toName?: string;
    members?: { email: string; name: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    if (body.kind === "group") {
      if (!body.members?.length) {
        return NextResponse.json({ error: "Add at least one member" }, { status: 400 });
      }
      const thread = await createGroupChat({
        communityId: session.communityId ?? null,
        createdByEmail: session.email,
        createdByName: session.name,
        title: body.title ?? "Group chat",
        members: body.members,
      });
      return NextResponse.json({ ok: true, thread });
    }

    if (!body.toEmail) {
      return NextResponse.json({ error: "Recipient required" }, { status: 400 });
    }

    const thread = await getOrCreateDmThread({
      communityId: session.communityId ?? null,
      fromEmail: session.email,
      fromName: session.name,
      toEmail: body.toEmail,
      toName: body.toName ?? body.toEmail,
    });
    if (!thread) {
      return NextResponse.json({ error: "Could not start conversation" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, thread });
  } catch (err) {
    if (err instanceof ChatCommunityScopeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
