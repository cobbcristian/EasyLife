import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { canMutateCommunityResource } from "@/lib/server/community-resource-scope";
import { deleteProvider, setProviderStatus } from "@/lib/server/db";
import { ensureRecordsSeeded, listMenuItems } from "@/lib/server/records";
import {
  serviceCatalogForProvider,
  usesMenuAsPrimaryCatalog,
} from "@/lib/provider-offerings";
import { prisma } from "@/lib/server/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await ensureRecordsSeeded();
  const row = await prisma.provider.findUnique({
    where: { id },
    include: { community: { select: { id: true, name: true, location: true } } },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner =
    session.role === "provider" &&
    (session.name === row.name || session.communityId === row.communityId);
  const isAdmin = session.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const menuItems = await listMenuItems(session.email);
  const feeSchedule = usesMenuAsPrimaryCatalog(row)
    ? menuItems.map((item) => ({
        id: item.id,
        service: item.name,
        rate: item.price,
      }))
    : serviceCatalogForProvider(row).map((item) => ({
        id: item.id,
        service: item.name,
        rate: item.price,
      }));

  return NextResponse.json({
    provider: {
      id: row.id,
      businessName: row.name,
      category: row.category,
      type: row.type,
      email: session.email,
      phone: "",
      address: row.community.location,
      communityId: row.community.id,
      communityName: row.community.name,
    },
    feeSchedule,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.provider.findUnique({
    where: { id },
    select: { communityId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutateCommunityResource(session, existing.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await deleteProvider(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidatePath("/services-activities");
  revalidatePath("/communities");
  revalidatePath("/users");
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: "active" | "frozen" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.status !== "active" && body.status !== "frozen") {
    return NextResponse.json({ error: "status must be active or frozen" }, { status: 400 });
  }

  const existing = await prisma.provider.findUnique({
    where: { id },
    select: { communityId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutateCommunityResource(session, existing.communityId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await setProviderStatus(id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePath("/services-activities");
  revalidatePath("/users");
  return NextResponse.json({ ok: true, provider: updated });
}
