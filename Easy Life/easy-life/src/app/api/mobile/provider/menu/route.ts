import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  createMenuItem,
  ensureRecordsSeeded,
  listMenuItems,
  toggleMenuItem,
} from "@/lib/server/records";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  const items = await listMenuItems(session.email);
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      category: i.category,
      available: i.available,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; price?: number; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const item = await createMenuItem({
    providerEmail: session.email,
    name: body.name.trim(),
    price: Number(body.price) || 0,
    category: body.category?.trim() || "Mains",
  });
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(request: Request) {
  const session = await getMobileSession(request);
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const item = await toggleMenuItem(body.id, session.email);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item });
}
