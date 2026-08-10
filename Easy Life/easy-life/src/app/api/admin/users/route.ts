import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import {
  createUser,
  listAdminUsers,
  listCommunities,
} from "@/lib/server/db";
import { logEvent } from "@/lib/server/records";
import type { AuthRole } from "@/lib/types";

const ALLOWED_ROLES: AuthRole[] = ["admin", "member", "board", "pm", "provider", "sales"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId");
  const scoped =
    isSuperAdmin(session)
      ? communityId || undefined
      : session.communityId ?? undefined;

  const [users, communities] = await Promise.all([
    listAdminUsers(
      isSuperAdmin(session)
        ? scoped
          ? { communityId: scoped }
          : undefined
        : { communityId: session.communityId },
    ),
    isSuperAdmin(session) ? listCommunities() : Promise.resolve([]),
  ]);

  return NextResponse.json({
    users,
    communities: communities.map((c) => ({ id: c.id, name: c.name })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    email?: string;
    name?: string;
    role?: string;
    password?: string;
    communityId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const role = body.role as AuthRole | undefined;
  const password = body.password?.trim() || "password";

  if (!email?.includes("@") || !name || !role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "name, email, and a valid role are required" },
      { status: 400 },
    );
  }

  let communityId: string | null | undefined = body.communityId;
  if (!isSuperAdmin(session)) {
    communityId = session.communityId;
  } else if (role === "admin" && (communityId === "" || communityId === undefined)) {
    // Super admin creating another platform admin
    communityId = null;
  }

  const created = await createUser({
    email,
    name,
    role,
    password,
    communityId: communityId ?? null,
  });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }

  await logEvent({
    communityId: created.communityId,
    userName: session.name,
    action: "User created",
    detail: `${created.role} ${created.email}`,
  });

  revalidatePath("/users");
  return NextResponse.json({
    ok: true,
    user: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      communityId: created.communityId ?? null,
      status: created.status ?? "active",
    },
  });
}
