import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  deleteProviderOffering,
  ensureSeedProviderOfferings,
  listProviderOfferings,
  upsertProviderOffering,
} from "@/lib/server/project-management";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const kind = new URL(request.url).searchParams.get("kind") as
    | "activity"
    | "service"
    | null;
  await ensureSeedProviderOfferings(session.email);
  const offerings = await listProviderOfferings(
    session.email,
    kind ?? undefined,
  );
  return NextResponse.json({
    offerings: offerings.map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      kind: o.kind,
      priceLabel: o.priceLabel,
      priceCents: o.priceCents,
      image: o.imageUrl,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    id?: string;
    name?: string;
    description?: string;
    kind?: "activity" | "service";
    priceLabel?: string;
    priceCents?: number;
    imageUrl?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const offering = await upsertProviderOffering({
    id: body.id,
    providerEmail: session.email,
    name: body.name,
    description: body.description,
    kind: body.kind ?? "activity",
    priceLabel: body.priceLabel,
    priceCents: body.priceCents,
    imageUrl: body.imageUrl,
  });
  return NextResponse.json({ ok: true, offering });
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
  const ok = await deleteProviderOffering(body.id, session.email);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
