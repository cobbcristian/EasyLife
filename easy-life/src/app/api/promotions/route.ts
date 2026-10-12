import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createPromotion,
  deletePromotion,
  ensureRecordsSeeded,
  listPromotions,
} from "@/lib/server/records";
import { parseBody, promotionSchema } from "@/lib/server/validation";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  return NextResponse.json({ promotions: await listPromotions(session.email) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(promotionSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const promotion = await createPromotion({
    providerEmail: session.email,
    communityId: session.communityId,
    title: parsed.data.title,
    type: parsed.data.type,
    detail: parsed.data.detail,
    status: parsed.data.status,
    imageUrl: parsed.data.imageUrl || null,
    href: parsed.data.href || null,
    subtitle: parsed.data.subtitle || null,
    rating: parsed.data.rating || null,
    priceLabel: parsed.data.priceLabel || null,
  });
  revalidatePath("/provider/promotions");
  return NextResponse.json({ ok: true, promotion });
}

export async function DELETE(request: Request) {
  const session = await getSession();
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
  const ok = await deletePromotion(body.id, session.email);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidatePath("/provider/promotions");
  revalidatePath("/member");
  return NextResponse.json({ ok: true });
}
