import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getRoleMatrix, saveRoleMatrix } from "@/lib/server/records";
import { isSuperAdmin } from "@/lib/server/community-context";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ matrix: await getRoleMatrix() });
}

export async function PUT(request: Request) {
  const session = await getSession();
  // Global permission matrix affects every club — only platform super-admins may write.
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
