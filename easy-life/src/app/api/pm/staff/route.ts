import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { createUser, deleteUserAccount } from "@/lib/server/db";
import { upsertMembership } from "@/lib/server/memberships";
import { prisma } from "@/lib/server/prisma";
import { sendEmail } from "@/lib/server/notify";
import { appPath } from "@/lib/server/app-url";
import type { AuthRole } from "@/lib/types";

const STAFF_ROLES = new Set<AuthRole>(["admin", "pm", "board"]);

function canEdit(role: string | undefined) {
  return role === "admin" || role === "pm" || role === "board";
}

function isStaffRole(role: string): role is AuthRole {
  return STAFF_ROLES.has(role as AuthRole);
}

export async function GET() {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const users = await prisma.user.findMany({
    where: { communityId, role: { in: ["admin", "pm", "board"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      avatarUrl: true,
    },
  });
  const emails = users.map((user) => user.email.toLowerCase());
  const profiles = emails.length
    ? await prisma.memberProfileExt.findMany({
        where: { userEmail: { in: emails } },
        select: { userEmail: true, phone: true },
      })
    : [];
  const phones = new Map(profiles.map((row) => [row.userEmail, row.phone ?? ""]));
  return NextResponse.json({
    me: session.sub,
    staff: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      phone: phones.get(user.email.toLowerCase()) ?? "",
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; email?: string; role?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role ?? "pm";
  const phone = body.phone?.trim() ?? "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Name must be 2 to 80 characters" }, { status: 400 });
  }
  if (!email.includes("@") || email.length > 120) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!isStaffRole(role)) {
    return NextResponse.json({ error: "Role must be admin, community manager, or board" }, { status: 400 });
  }
  if (phone.length > 30) {
    return NextResponse.json({ error: "Phone is too long" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const temporaryPassword = randomBytes(9).toString("base64url");
  const created = await createUser({
    email,
    password: temporaryPassword,
    role,
    name,
    communityId,
    status: "active",
  });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }
  if (phone) {
    await prisma.memberProfileExt.upsert({
      where: { userEmail: email },
      create: { userEmail: email, phone },
      update: { phone },
    });
  }
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true },
  });
  await sendEmail({
    to: email,
    subject: `Your ${community?.name ?? "community"} staff login`,
    body: [
      `Hi ${name},`,
      "",
      `${session.name} added you as ${role === "pm" ? "a community manager" : role === "board" ? "a board member" : "an admin"} for ${community?.name ?? "the community"}.`,
      "",
      `Sign in: ${appPath("/login")}`,
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "Change this password after you sign in.",
    ].join("\n"),
  }).catch(() => undefined);
  return NextResponse.json({
    ok: true,
    temporaryPassword,
    staff: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      status: created.status ?? "active",
      avatarUrl: null,
      phone,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string; name?: string; role?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Profile is required" }, { status: 400 });
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.user.findFirst({
    where: { id: body.id, communityId, role: { in: ["admin", "pm", "board"] } },
  });
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const name = body.name?.trim() ?? existing.name;
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Name must be 2 to 80 characters" }, { status: 400 });
  }
  const role = body.role ?? existing.role;
  if (!isStaffRole(role)) {
    return NextResponse.json({ error: "Role must be admin, community manager, or board" }, { status: 400 });
  }
  if (existing.id === session.sub && role !== existing.role) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  const phone = body.phone?.trim() ?? "";
  if (phone.length > 30) {
    return NextResponse.json({ error: "Phone is too long" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: existing.id },
    data: { name, role },
  });
  await upsertMembership({
    userId: existing.id,
    communityId,
    role,
    status: "active",
  });
  await prisma.memberProfileExt.upsert({
    where: { userEmail: existing.email.toLowerCase() },
    create: { userEmail: existing.email.toLowerCase(), phone: phone || null },
    update: { phone: phone || null },
  });
  return NextResponse.json({
    ok: true,
    staff: {
      id: existing.id,
      email: existing.email,
      name,
      role,
      status: existing.status,
      avatarUrl: existing.avatarUrl,
      phone,
    },
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "Profile is required" }, { status: 400 });
  if (body.id === session.sub) {
    return NextResponse.json({ error: "You cannot delete your own profile" }, { status: 400 });
  }
  const communityId = await resolveScopedCommunityId(session);
  const existing = await prisma.user.findFirst({
    where: { id: body.id, communityId, role: { in: ["admin", "pm", "board"] } },
  });
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  await deleteUserAccount(existing.id);
  return NextResponse.json({ ok: true });
}
