import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin } from "@/lib/server/community-context";
import { updateInvoiceStatus } from "@/lib/server/records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !["board", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.status !== "approved" && body.status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateInvoiceStatus(
    id,
    body.status,
    isSuperAdmin(session) ? undefined : session.communityId,
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidatePath("/board/invoices");
  revalidatePath("/pm/invoices");
  return NextResponse.json({ ok: true });
}
