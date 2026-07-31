import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createRental,
  getRentalFlexAvailability,
  listRentalsForMember,
  RentalConflictError,
} from "@/lib/server/records";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  const startDate = url.searchParams.get("startDate");
  const daysRaw = url.searchParams.get("days");
  if (itemId) {
    const availability = await getRentalFlexAvailability({
      communityId: session.communityId,
      itemId,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      days: daysRaw ? Number(daysRaw) : 1,
    });
    return NextResponse.json({ availability });
  }

  return NextResponse.json({ rentals: await listRentalsForMember(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    item?: string;
    days?: number;
    total?: number;
    itemId?: string;
    flex?: string;
    startDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.item || body.total == null) {
    return NextResponse.json({ error: "Item and total required" }, { status: 400 });
  }
  try {
    const rental = await createRental({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      item: body.item,
      days: body.days ?? 1,
      total: Number(body.total),
      itemId: body.itemId,
      flex: body.flex,
      startDate: body.startDate,
    });
    revalidatePath("/member/rentals");
    return NextResponse.json({ ok: true, rental });
  } catch (err) {
    if (err instanceof RentalConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
