import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  isSuperAdmin,
  resolveScopedCommunityId,
} from "@/lib/server/community-context";
import {
  APPAREL_VENDOR,
  createApparelOrder,
  ensureRecordsSeeded,
  listApparelOrders,
  updateApparelOrderStatus,
} from "@/lib/server/records";
import { parseBody, apparelOrderSchema } from "@/lib/server/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const communityId =
    session.role === "admin"
      ? await resolveScopedCommunityId(session)
      : session.communityId;

  const orders = await listApparelOrders(
    session.role === "member"
      ? { communityId, orderedByEmail: session.email }
      : { communityId },
  );

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      vendorName: o.vendorName,
      orderType: o.orderType,
      orderedByName: o.orderedByName,
      items: JSON.parse(o.itemsJson),
      total: o.total,
      notes: o.notes,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    vendor: APPAREL_VENDOR,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseBody(apparelOrderSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const orderType =
    parsed.data.orderType ??
    (session.role === "admin" ? "club" : "member");

  if (orderType === "club" && session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId =
    session.role === "admin"
      ? await resolveScopedCommunityId(session)
      : session.communityId;

  const result = await createApparelOrder({
    communityId,
    orderType,
    orderedByEmail: session.email,
    orderedByName: session.name,
    items: parsed.data.items,
    notes: parsed.data.notes,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  revalidatePath("/apparel");
  revalidatePath("/member/apparel");
  return NextResponse.json({ ok: true, order: result.order });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "ID and status required" }, { status: 400 });
  }

  const communityId = await resolveScopedCommunityId(session);
  const updated = await updateApparelOrderStatus(
    body.id,
    body.status,
    isSuperAdmin(session) ? undefined : communityId,
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidatePath("/apparel");
  return NextResponse.json({ ok: true, order: updated });
}
