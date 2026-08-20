import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { priceDiningOrderForCommunity } from "@/lib/server/dining-order-price";
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
    items?: { id?: string; name?: string; qty?: number; price?: number }[];
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
  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const priced = await priceDiningOrderForCommunity({
    communityId: session.communityId,
    items: body.items,
    fulfillment: body.fulfillment,
  });
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }

  const fulfillment = normalizeDiningFulfillment(body.fulfillment);
  try {
    const order = await createOrder({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      items: JSON.stringify(
        priced.lines.map((line) => ({ name: line.name, qty: line.qty })),
      ),
      total: priced.total,
      fulfillment,
      address: body.address ?? null,
      restaurant: body.restaurant ?? null,
      arriveDate: body.arriveDate ?? null,
      arriveTime: body.arriveTime ?? null,
      partySize: body.partySize ?? null,
      itemCount: priced.lines.reduce((s, line) => s + line.qty, 0),
    });
    revalidatePath("/member/dining");
    revalidatePath(`/member/orders/${order.id}`);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
