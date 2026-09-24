import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { getRoleMatrix, saveRoleMatrix } from "@/lib/server/records";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ matrix: await getRoleMatrix() });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only platform super-admin (no communityId) can modify the global role matrix.
  // Club admins can view but not change permissions.
  if (!isSuperAdmin(session)) {
    return NextResponse.json(
      { error: "Only platform super-admin can modify the role matrix" },
      { status: 403 },
    );
  }

  let body: { matrix?: Record<string, string[]> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.matrix) return NextResponse.json({ error: "Matrix required" }, { status: 400 });
  await saveRoleMatrix(body.matrix);
  return NextResponse.json({ ok: true });
}
