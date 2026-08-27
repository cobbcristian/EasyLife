import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  createPosChit,
  listOpenChits,
  listMemberChits,
  postPosChitToAccount,
  voidPosChit,
} from "@/lib/server/pos-chits";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  if (session.role === "member") {
    return NextResponse.json({
      chits: await listMemberChits(session.email, communityId),
    });
  }
  return NextResponse.json({ chits: await listOpenChits(communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: {
    memberEmail: string;
    memberName: string;
    location?: string;
    serverName?: string;
    lines: { name: string; qty: number; unitPrice: number; menuItemId?: string }[];
    tip?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const chit = await createPosChit({
    communityId,
    ...body,
  });
  return NextResponse.json({ chit });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: { id: string; action: "post" | "void" };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.action === "post") {
    const chit = await postPosChitToAccount(body.id, session.name, communityId);
    if (!chit) return NextResponse.json({ error: "Cannot post chit" }, { status: 400 });
    return NextResponse.json({ chit });
  }
  if (body.action === "void") {
    const ok = await voidPosChit(body.id, communityId);
    if (!ok) return NextResponse.json({ error: "Cannot void chit" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
