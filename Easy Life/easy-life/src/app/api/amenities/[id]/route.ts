import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { deleteAmenity, setAmenityPlayability } from "@/lib/server/records";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "pm" && session.role !== "board")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: {
    playable?: boolean;
    reason?: string | null;
    until?: string | null;
    broadcast?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.playable !== "boolean") {
    return NextResponse.json({ error: "playable boolean required" }, { status: 400 });
  }
  const updated = await setAmenityPlayability({
    amenityId: id,
    playable: body.playable,
    reason: body.reason,
    until: body.until,
    authorName: session.name,
    communityId: session.communityId,
    broadcast: body.broadcast !== false,
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidatePath("/amenities");
  revalidatePath("/member/bookings");
  return NextResponse.json({ ok: true, amenity: updated });
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
  await deleteAmenity(id);
  revalidatePath("/amenities");
  return NextResponse.json({ ok: true });
}
