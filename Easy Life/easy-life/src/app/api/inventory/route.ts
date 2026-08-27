import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  listInventory,
  createInventoryItem,
  adjustInventory,
  getLowStockItems,
} from "@/lib/server/inventory";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  if (searchParams.get("lowStock") === "1") {
    return NextResponse.json({ items: await getLowStockItems(communityId) });
  }
  return NextResponse.json({ items: await listInventory(communityId) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["pm", "admin", "board"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const communityId = session.communityId;
  if (!communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  let body: {
    action?: "create" | "adjust";
    sku?: string;
    name?: string;
    category?: string;
    qtyOnHand?: number;
    itemId?: string;
    type?: "receive" | "sale" | "adjustment" | "transfer";
    qty?: number;
    note?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "adjust" && body.itemId && body.type && body.qty != null) {
    try {
      const item = await adjustInventory({
        itemId: body.itemId,
        communityId,
        type: body.type,
        qty: body.qty,
        note: body.note,
        createdBy: session.name,
      });
      return NextResponse.json({ item });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed" },
        { status: 404 },
      );
    }
  }

  if (!body.sku || !body.name) {
    return NextResponse.json({ error: "sku and name required" }, { status: 400 });
  }

  const item = await createInventoryItem({
    communityId,
    sku: body.sku,
    name: body.name,
    category: body.category,
    qtyOnHand: body.qtyOnHand,
  });
  return NextResponse.json({ item });
}
