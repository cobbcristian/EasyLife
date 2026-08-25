import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { cancelCommunityEvent, logEvent } from "@/lib/server/records";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await cancelCommunityEvent(id, {
    email: session.email,
    name: session.name,
    role: session.role,
    communityId: session.communityId,
  });
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Event cancelled",
    detail: id,
  });
  revalidatePath("/member/calendar");
  revalidatePath("/member/notifications");
  return NextResponse.json({ ok: true });
}
