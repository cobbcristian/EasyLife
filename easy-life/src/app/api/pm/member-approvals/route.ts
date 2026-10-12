import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  approvePendingMember,
  listPendingMembers,
  rejectPendingMember,
} from "@/lib/server/member-enrollment";
import { logEvent } from "@/lib/server/records";

function canApprove(role: string): boolean {
  return role === "admin" || role === "pm" || role === "board";
}

/** List residents awaiting HOA enrollment approval. */
export async function GET() {
  const session = await getSession();
  if (!session || !canApprove(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId && !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  if (!session.communityId) {
    return NextResponse.json({ pending: [] });
  }
  const pending = await listPendingMembers(session.communityId);
  return NextResponse.json({ pending });
}

/** Approve or reject a pending resident registration. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canApprove(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const action = body.action === "reject" ? "reject" : "approve";
  const communityScope = isSuperAdmin(session) ? undefined : session.communityId;

  if (action === "reject") {
    const result = await rejectPendingMember({
      userId: body.userId,
      communityId: communityScope,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await logEvent({
      communityId: result.user.communityId,
      userName: session.name,
      action: "Member rejected",
      detail: result.user.email,
    });
    revalidatePath("/pm/member-approvals");
    revalidatePath("/board/member-approvals");
    revalidatePath("/users");
    return NextResponse.json({ ok: true, action, user: result.user });
  }

  const result = await approvePendingMember({
    userId: body.userId,
    communityId: communityScope,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logEvent({
    communityId: result.user.communityId,
    userName: session.name,
    action: "Member approved",
    detail: `${result.user.email}${result.user.unit ? ` · Unit ${result.user.unit}` : ""}`,
  });

  revalidatePath("/pm/member-approvals");
  revalidatePath("/board/member-approvals");
  revalidatePath("/users");
  revalidatePath("/member/directory");
  return NextResponse.json({ ok: true, action, user: result.user });
}
