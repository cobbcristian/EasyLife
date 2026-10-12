import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { deleteMenuItem, toggleMenuItem } from "@/lib/server/records";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await toggleMenuItem(id, session.email);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/provider/menu");
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await deleteMenuItem(id, session.email);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/provider/menu");
  return NextResponse.json({ ok: true });
}
