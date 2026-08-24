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

/**
 * Platform-wide permission matrix (no community column).
 * Only platform super-admins may rewrite it — club admins must not
 * lock other clubs out of Pay dues / documents / etc.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
