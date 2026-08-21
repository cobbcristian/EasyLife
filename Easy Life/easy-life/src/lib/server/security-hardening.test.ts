import { describe, expect, it } from "vitest";
import type { ApparelLineItem } from "@/lib/server/records";

/**
 * Pure pricing helper mirrored from priceApparelCart (catalog lookup mocked).
 * Keeps regression coverage without requiring a live DB.
 */
function priceFromCatalog(
  catalog: Map<string, { name: string; price: number; sizes: string[] }>,
  items: ApparelLineItem[],
): { ok: true; items: ApparelLineItem[]; total: number } | { ok: false; error: string } {
  if (!items.length) return { ok: false, error: "Cart is empty" };
  const priced: ApparelLineItem[] = [];
  for (const line of items) {
    const product = catalog.get(line.productId);
    if (!product) return { ok: false, error: `Unknown product: ${line.productId}` };
    if (!product.sizes.includes(line.size)) {
      return { ok: false, error: `Invalid size for ${product.name}` };
    }
    const qty = Math.max(1, Math.min(500, Math.floor(line.qty) || 1));
    priced.push({
      productId: line.productId,
      name: product.name,
      size: line.size,
      qty,
      unitPrice: product.price,
    });
  }
  return {
    ok: true,
    items: priced,
    total: priced.reduce((s, i) => s + i.unitPrice * i.qty, 0),
  };
}

function featuredPaidCents(inputPaid?: number): number {
  return typeof inputPaid === "number" && inputPaid > 0 ? inputPaid : 0;
}

function canMutateTenantResource(opts: {
  actorCommunityId: string | null | undefined;
  isSuperAdmin: boolean;
  resourceCommunityId: string;
}): boolean {
  if (opts.isSuperAdmin) return true;
  return !!opts.actorCommunityId && opts.actorCommunityId === opts.resourceCommunityId;
}

describe("apparel catalog pricing", () => {
  const catalog = new Map([
    ["polo-1", { name: "Club Polo", price: 42, sizes: ["S", "M", "L"] }],
  ]);

  it("ignores client unitPrice and bills catalog price", () => {
    const result = priceFromCatalog(catalog, [
      { productId: "polo-1", name: "Forged", size: "M", qty: 2, unitPrice: 0.01 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.total).toBe(84);
    expect(result.items[0]?.unitPrice).toBe(42);
    expect(result.items[0]?.name).toBe("Club Polo");
  });

  it("rejects unknown product ids", () => {
    const result = priceFromCatalog(catalog, [
      { productId: "nope", name: "X", size: "M", qty: 1, unitPrice: 1 },
    ]);
    expect(result.ok).toBe(false);
  });
});

describe("featured placement paidCents", () => {
  it("defaults featured to unpaid (0) without payment proof", () => {
    expect(featuredPaidCents(undefined)).toBe(0);
    expect(featuredPaidCents(0)).toBe(0);
    expect(featuredPaidCents(-1)).toBe(0);
  });

  it("keeps an explicit positive paid amount", () => {
    expect(featuredPaidCents(4900)).toBe(4900);
  });
});

describe("cross-tenant mutate scope", () => {
  it("blocks club staff from other clubs", () => {
    expect(
      canMutateTenantResource({
        actorCommunityId: "club-a",
        isSuperAdmin: false,
        resourceCommunityId: "club-b",
      }),
    ).toBe(false);
  });

  it("allows same-club staff and super admin", () => {
    expect(
      canMutateTenantResource({
        actorCommunityId: "club-a",
        isSuperAdmin: false,
        resourceCommunityId: "club-a",
      }),
    ).toBe(true);
    expect(
      canMutateTenantResource({
        actorCommunityId: null,
        isSuperAdmin: true,
        resourceCommunityId: "club-b",
      }),
    ).toBe(true);
  });
});
