import { prisma } from "@/lib/server/prisma";
import { logEvent } from "@/lib/server/records";

export interface MicrosMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available?: boolean;
}

export interface PosSyncResult {
  ok: boolean;
  imported: number;
  updated: number;
  error?: string;
  mode: "live" | "demo";
}

function isMicrosConfigured(): boolean {
  return Boolean(process.env.MICROS_API_URL && process.env.MICROS_API_KEY);
}

async function fetchMicrosMenu(): Promise<MicrosMenuItem[]> {
  const base = process.env.MICROS_API_URL!;
  const key = process.env.MICROS_API_KEY!;
  const res = await fetch(`${base.replace(/\/$/, "")}/menu/items`, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`MICROS API returned ${res.status}`);
  const data = (await res.json()) as { items?: MicrosMenuItem[] };
  return data.items ?? [];
}

function demoMenuItems(): MicrosMenuItem[] {
  return [
    { id: "micros-1", name: "Club Burger", price: 18, category: "Entrees", available: true },
    { id: "micros-2", name: "Caesar Salad", price: 14, category: "Salads", available: true },
    { id: "micros-3", name: "Fresh Lemonade", price: 6, category: "Beverages", available: true },
  ];
}

export async function syncPosMenu(input: {
  communityId: string;
  providerEmail: string;
  actorName: string;
}): Promise<PosSyncResult> {
  let items: MicrosMenuItem[];
  let mode: PosSyncResult["mode"] = "demo";

  try {
    if (isMicrosConfigured()) {
      items = await fetchMicrosMenu();
      mode = "live";
    } else {
      items = demoMenuItems();
    }
  } catch (err) {
    return {
      ok: false,
      imported: 0,
      updated: 0,
      mode: "live",
      error: err instanceof Error ? err.message : "POS sync failed",
    };
  }

  let imported = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.menuItem.findFirst({
      where: { providerEmail: input.providerEmail, posExternalId: item.id },
    });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          price: item.price,
          category: item.category,
          available: item.available ?? true,
        },
      });
      updated++;
    } else {
      await prisma.menuItem.create({
        data: {
          providerEmail: input.providerEmail,
          name: item.name,
          price: item.price,
          category: item.category,
          available: item.available ?? true,
          posExternalId: item.id,
        },
      });
      imported++;
    }
  }

  await prisma.community.update({
    where: { id: input.communityId },
    data: { posLastSyncAt: new Date(), posProvider: "micros" },
  });

  await logEvent({
    communityId: input.communityId,
    userName: input.actorName,
    action: "POS menu sync",
    detail: `${mode}: ${imported} new, ${updated} updated`,
  });

  return { ok: true, imported, updated, mode };
}

export function posStatus() {
  return {
    configured: isMicrosConfigured(),
    provider: "micros",
    apiUrl: process.env.MICROS_API_URL ? "set" : "missing",
  };
}
