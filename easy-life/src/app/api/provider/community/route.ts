import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { getCommunityById } from "@/lib/server/db";
import { ensureRecordsSeeded, listMenuItems } from "@/lib/server/records";
import {
  ensureSeedProviderOfferings,
  listProviderOfferings,
} from "@/lib/server/project-management";
import {
  serviceCatalogForProvider,
  usesMenuAsPrimaryCatalog,
} from "@/lib/provider-offerings";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  await ensureSeedProviderOfferings(session.email);
  const community = session.communityId
    ? await getCommunityById(session.communityId)
    : undefined;
  const provider = session.communityId
    ? await prisma.provider.findFirst({
        where: { communityId: session.communityId, name: session.name },
      })
    : null;
  const menuItems = await listMenuItems(session.email);
  const staticCatalog = provider ? serviceCatalogForProvider(provider) : [];
  const offerings = await listProviderOfferings(session.email, "service");
  const offeringCatalog = offerings.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.priceCents / 100,
    category: provider?.category ?? "Service",
    duration: undefined,
  }));
  const catalog =
    staticCatalog.length > 0
      ? staticCatalog
      : offeringCatalog.length > 0
        ? offeringCatalog
        : provider && usesMenuAsPrimaryCatalog(provider)
          ? menuItems.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category,
              duration: undefined,
            }))
          : [];

  return NextResponse.json({
    community: community
      ? {
          id: community.id,
          name: community.name,
          location: community.location,
          coverColor: community.coverColor,
        }
      : null,
    provider: {
      id: provider?.id ?? null,
      businessName: session.name,
      category: provider?.category ?? "",
      type: provider?.type ?? "service",
      phone: provider?.phone ?? "",
      email: provider?.email ?? session.email,
      address: community?.location ?? "",
      about: provider?.description ?? "",
    },
    services: catalog,
    menuItemCount: menuItems.length,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    businessName?: string;
    category?: string;
    phone?: string;
    email?: string;
    about?: string;
    type?: "service" | "activity";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const provider = session.communityId
    ? await prisma.provider.findFirst({
        where: {
          communityId: session.communityId,
          OR: [{ email: session.email }, { name: session.name }],
        },
      })
    : null;

  if (!provider) {
    return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
  }

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: {
      name: body.businessName?.trim() || provider.name,
      category: body.category?.trim() || provider.category,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || provider.email,
      description: body.about ?? provider.description,
      type: body.type === "activity" || body.type === "service" ? body.type : provider.type,
    },
  });

  if (body.businessName?.trim() && body.businessName.trim() !== session.name) {
    await prisma.user.updateMany({
      where: { email: session.email },
      data: { name: body.businessName.trim() },
    });
  }

  return NextResponse.json({
    ok: true,
    provider: {
      id: updated.id,
      businessName: updated.name,
      category: updated.category,
      type: updated.type,
      phone: updated.phone ?? "",
      email: updated.email ?? session.email,
      about: updated.description,
    },
  });
}
