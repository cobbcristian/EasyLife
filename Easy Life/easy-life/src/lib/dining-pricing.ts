import { normalizeDiningFulfillment } from "@/lib/dining-order";

/** Matches the member dining UI delivery surcharge. */
export const DINING_DELIVERY_FEE = 4;

export type DiningMenuRow = {
  id: string;
  name: string;
  price: number;
  available?: boolean;
};

export type DiningCartLineInput = {
  id?: string;
  name?: string;
  qty?: number;
  /** Ignored — prices come from the menu. */
  price?: number;
};

export type PricedDiningLine = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

/**
 * Price a dining cart from the club menu. Never trusts client unit prices or totals.
 */
export function priceDiningCart(input: {
  menu: DiningMenuRow[];
  items: DiningCartLineInput[];
  fulfillment?: string | null;
}):
  | {
      ok: true;
      lines: PricedDiningLine[];
      subtotal: number;
      deliveryFee: number;
      total: number;
    }
  | { ok: false; error: string } {
  if (!input.items.length) {
    return { ok: false, error: "Cart is empty" };
  }

  const byId = new Map(input.menu.map((m) => [m.id, m]));
  const byName = new Map(
    input.menu.map((m) => [m.name.trim().toLowerCase(), m]),
  );

  const lines: PricedDiningLine[] = [];
  for (const raw of input.items) {
    const qty = Math.max(1, Math.floor(Number(raw.qty) || 1));
    const id = raw.id?.trim();
    const nameKey = raw.name?.trim().toLowerCase() ?? "";
    const menuItem =
      (id ? byId.get(id) : undefined) ??
      (nameKey ? byName.get(nameKey) : undefined);
    if (!menuItem) {
      return {
        ok: false,
        error: `Unknown menu item${raw.name ? `: ${raw.name}` : ""}`,
      };
    }
    if (menuItem.available === false) {
      return {
        ok: false,
        error: `${menuItem.name} is not available`,
      };
    }
    const unitPrice = Number(menuItem.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: `Invalid price for ${menuItem.name}` };
    }
    lines.push({
      id: menuItem.id,
      name: menuItem.name,
      qty,
      unitPrice,
      lineTotal: unitPrice * qty,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const fulfillment = normalizeDiningFulfillment(input.fulfillment);
  const deliveryFee = fulfillment === "delivery" ? DINING_DELIVERY_FEE : 0;
  return {
    ok: true,
    lines,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}
