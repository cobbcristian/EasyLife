import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import { diningProviderEmail } from "@/lib/server/dining";
import { priceDiningOrderForCommunity } from "@/lib/server/dining-order-price";
import {
  createOrder,
  ensureRecordsSeeded,
  listMenuItems,
  listOrdersForMember,
} from "@/lib/server/records";
import { normalizeDiningFulfillment } from "@/lib/dining-order";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const url = new URL(request.url);
  const clubDining = diningProviderEmail(session.communityId);
  const providerEmail = url.searchParams.get("providerEmail") ?? clubDining;

  if (url.searchParams.get("menu") === "1") {
    if (!providerEmail) {
      return NextResponse.json({ items: [] });
    }
    const items = await listMenuItems(providerEmail);
    return NextResponse.json({
      items: items
        .filter((i) => i.available)
        .map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          category: i.category,
        })),
    });
  }

  const orders = await listOrdersForMember(session.email);
  const isIronLake = session.communityId === "iron-lake";
  const restaurants = clubDining
    ? [
        isIronLake
          ? {
              id: "clubhouse",
              name: "Clubhouse Restaurant",
              category: "American · Club Dining",
              email: clubDining,
            }
          : {
              id: "clubhouse",
              name: "Clubhouse Dining",
              category: "Club Dining",
              email: clubDining,
            },
      ]
    : [];
  return NextResponse.json({
    restaurants,
    orders: orders.slice(0, 10).map((o) => ({
      id: o.id,
      items: o.items,
      total: o.total,
      status: o.status,
      fulfillment: o.fulfillment,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    items?: Array<{ id?: string; name?: string; price?: number; qty?: number }>;
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
    return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  }
  const priced = await priceDiningOrderForCommunity({
    communityId: session.communityId,
    items: body.items,
    fulfillment: body.fulfillment ?? "takeout",
  });
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }
  try {
    const order = await createOrder({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      items: JSON.stringify(
        priced.lines.map((line) => ({ name: line.name, qty: line.qty })),
      ),
      total: priced.total,
      fulfillment: normalizeDiningFulfillment(body.fulfillment ?? "takeout"),
      address: body.address,
      restaurant: body.restaurant ?? "Club restaurant",
      arriveDate: body.arriveDate ?? new Date().toISOString().slice(0, 10),
      arriveTime: body.arriveTime ?? "18:00",
      partySize: body.partySize,
      itemCount: priced.lines.reduce((s, line) => s + line.qty, 0),
    });
    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        items: order.items,
        total: order.total,
        status: order.status,
        fulfillment: order.fulfillment,
        tableLabel: order.tableLabel,
        readyBy: order.readyBy,
        arriveTime: order.arriveTime,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
