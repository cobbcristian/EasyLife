import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { createOrder, listOrdersForMember } from "@/lib/server/records";
import { normalizeDiningFulfillment } from "@/lib/dining-order";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ orders: await listOrdersForMember(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    items?: { name: string; qty: number }[];
    total?: number;
    fulfillment?: string;
    address?: string;
    restaurant?: string;
    arriveDate?: string;
    arriveTime?: string;
    partySize?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.items?.length || body.total == null) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const fulfillment = normalizeDiningFulfillment(body.fulfillment);
  try {
    const order = await createOrder({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      items: JSON.stringify(body.items),
      total: Number(body.total),
      fulfillment,
      address: body.address ?? null,
      restaurant: body.restaurant ?? null,
      arriveDate: body.arriveDate ?? null,
      arriveTime: body.arriveTime ?? null,
      partySize: body.partySize ?? null,
      itemCount: body.items.reduce((s, i) => s + Math.max(1, i.qty || 1), 0),
    });
    revalidatePath("/member/dining");
    revalidatePath(`/member/orders/${order.id}`);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
