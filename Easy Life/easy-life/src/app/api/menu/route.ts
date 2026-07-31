import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { createMenuItem, ensureRecordsSeeded, listMenuItems } from "@/lib/server/records";
import { diningProviderEmail } from "@/lib/server/dining";
import type { SessionPayload } from "@/lib/types";

function resolveProviderEmail(session: SessionPayload): string {
  return session.role === "provider" ? session.email : diningProviderEmail(session.communityId);
}

export async function GET() {
  const session = await getSession();
  if (!session || !["provider", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureRecordsSeeded();
  try {
    await ensureFourClubDemoContent("full", session.communityId, session.email);
  } catch (err) {
    console.error("[api/menu] four-club seed failed", err);
  }
  return NextResponse.json({ items: await listMenuItems(resolveProviderEmail(session)) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["provider", "pm"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { name?: string; price?: number; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.name || body.price == null) {
    return NextResponse.json({ error: "Name and price required" }, { status: 400 });
  }
  const item = await createMenuItem({
    providerEmail: resolveProviderEmail(session),
    name: body.name,
    price: Number(body.price),
    category: body.category ?? "Mains",
  });
  revalidatePath(session.role === "provider" ? "/provider/menu" : "/pm/dining");
  return NextResponse.json({ ok: true, item });
}
