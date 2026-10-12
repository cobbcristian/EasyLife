import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listAssistantHistory,
  runClubAssistant,
} from "@/lib/server/ai/assistant";
import type { AiAction } from "@/lib/server/ai/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const history = await listAssistantHistory(session.email);
  return NextResponse.json({
    messages: history.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      actions: JSON.parse(m.actionsJson || "[]"),
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { message?: string; confirmAction?: AiAction };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.message?.trim() && !body.confirmAction) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  const result = await runClubAssistant({
    communityId: session.communityId,
    userEmail: session.email,
    memberName: session.name,
    message: body.message ?? "",
    confirmAction: body.confirmAction,
  });
  return NextResponse.json(result);
}
