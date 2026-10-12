import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  deleteUserAccount,
  listAdminUsers,
  setUserStatus,
} from "@/lib/server/db";
import { approvePendingMember } from "@/lib/server/member-enrollment";
import { prisma } from "@/lib/server/prisma";
import { logEvent } from "@/lib/server/records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: "active" | "frozen" | "pending" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    body.status !== "active" &&
    body.status !== "frozen" &&
    body.status !== "pending"
  ) {
    return NextResponse.json(
      { error: "status must be active, pending, or frozen" },
      { status: 400 },
    );
  }

  if (id === session.sub && body.status === "frozen") {
    return NextResponse.json({ error: "You cannot freeze your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isSuperAdmin(session) && existing.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Approving a pending resident also turns on directory visibility.
  if (
    body.status === "active" &&
    existing.role === "member" &&
    existing.status === "pending"
  ) {
    const approved = await approvePendingMember({
      userId: id,
      communityId: isSuperAdmin(session) ? undefined : session.communityId,
    });
    if (!approved.ok) {
      return NextResponse.json(
        { error: approved.error },
        { status: approved.status },
      );
    }
    await logEvent({
      communityId: approved.user.communityId,
      userName: session.name,
      action: "Member approved",
      detail: approved.user.email,
    });
    revalidatePath("/users");
    revalidatePath("/pm/member-approvals");
    return NextResponse.json({ ok: true, user: approved.user });
  }

  const updated = await setUserStatus(id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSuperAdmin(session) && updated.communityId !== session.communityId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logEvent({
    communityId: updated.communityId,
    userName: session.name,
    action:
      body.status === "frozen"
        ? "User frozen"
        : body.status === "pending"
          ? "User set pending"
          : "User unfrozen",
    detail: updated.email,
  });

  revalidatePath("/users");
  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (id === session.sub) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const all = await listAdminUsers(
    isSuperAdmin(session) ? undefined : { communityId: session.communityId },
  );
  const user = all.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role === "admin" && !user.communityId) {
    const supers = all.filter((u) => u.role === "admin" && !u.communityId);
    if (supers.length <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last platform super admin" },
        { status: 400 },
      );
    }
  }

  const ok = await deleteUserAccount(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logEvent({
    communityId: user.communityId,
    userName: session.name,
    action: "User deleted",
    detail: user.email,
  });

  revalidatePath("/users");
  return NextResponse.json({ ok: true });
}
