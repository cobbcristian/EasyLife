import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  markContactMessageRead,
  markContactThreadRead,
  markContactThreadUnread,
} from "@/lib/server/records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let messageIds: string[] | undefined;
  let unread = false;
  try {
    const body: { messageIds?: unknown; unread?: unknown } = await request.json();
    if (Array.isArray(body.messageIds)) {
      messageIds = body.messageIds.filter((v: unknown): v is string => typeof v === "string");
    }
    unread = body.unread === true;
  } catch {
    // single-message read
  }

  await ensureRecordsSeeded();

  if (messageIds && messageIds.length > 0) {
    if (unread) {
      await markContactThreadUnread(session.email, messageIds);
      revalidatePath("/provider/messages");
      return NextResponse.json({ ok: true, unread: true });
    }
    await markContactThreadRead(session.email, messageIds);
    revalidatePath("/provider/messages");
    return NextResponse.json({ ok: true, unread: false });
  }

  if (unread) {
    await markContactThreadUnread(session.email, [id]);
    revalidatePath("/provider/messages");
    return NextResponse.json({ ok: true, id, unread: true });
  }

  const updated = await markContactMessageRead(id, session.email);
  if (!updated) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  revalidatePath("/provider/messages");
  return NextResponse.json({ ok: true, id, unread: false });
}
