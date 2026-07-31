import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { deleteVehicle } from "@/lib/server/records";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteVehicle(id, session.sub);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/member/profile");
  return NextResponse.json({ ok: true });
}
