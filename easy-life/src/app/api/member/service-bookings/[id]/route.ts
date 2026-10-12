import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  getCommunityBookingById,
  updateCommunityBookingStatus,
} from "@/lib/communities-data";
import { logEvent } from "@/lib/server/records";
import type { ServiceBookingStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  let status: ServiceBookingStatus | null = null;
  switch (action) {
    case "accept":
      status = "accepted";
      break;
    case "deny":
      status = "cancelled";
      break;
    default:
      status = null;
  }
  if (!status) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = getCommunityBookingById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = updateCommunityBookingStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: status === "accepted" ? "Member approved service booking" : "Member declined service booking",
    detail: `${updated.provider} · ${updated.service} · ${updated.date}`,
  });

  revalidatePath("/pm/front-desk");
  revalidatePath("/pm");
  revalidatePath("/member/calendar");
  revalidatePath("/member");

  return NextResponse.json({ ok: true, booking: updated });
}
