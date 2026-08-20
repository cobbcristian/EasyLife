import { describe, expect, it } from "vitest";
import { DINING_DELIVERY_FEE, priceDiningCart } from "@/lib/dining-pricing";

const menu = [
  { id: "m1", name: "Club Burger", price: 18, available: true },
  { id: "m2", name: "Caesar Salad", price: 12, available: true },
  { id: "m3", name: "Seasonal Special", price: 28, available: false },
];

describe("priceDiningCart", () => {
  it("prices by menu id and ignores client unit prices", () => {
    const result = priceDiningCart({
      menu,
      items: [
        { id: "m1", name: "Club Burger", qty: 2, price: 0.01 },
        { id: "m2", qty: 1, price: 999 },
      ],
      fulfillment: "takeout",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotal).toBe(48);
    expect(result.deliveryFee).toBe(0);
    expect(result.total).toBe(48);
  });

  it("matches by name when id is omitted", () => {
    const result = priceDiningCart({
      menu,
      items: [{ name: "club burger", qty: 1 }],
      fulfillment: "eat_in",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.total).toBe(18);
  });

  it("adds delivery fee from server, not client total", () => {
    const result = priceDiningCart({
      menu,
      items: [{ id: "m2", qty: 1 }],
      fulfillment: "delivery",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deliveryFee).toBe(DINING_DELIVERY_FEE);
    expect(result.total).toBe(12 + DINING_DELIVERY_FEE);
  });

  it("rejects unknown and unavailable items", () => {
    expect(
      priceDiningCart({
        menu,
        items: [{ name: "Free Lobster", qty: 1 }],
      }).ok,
    ).toBe(false);
    expect(
      priceDiningCart({
        menu,
        items: [{ id: "m3", qty: 1 }],
      }).ok,
    ).toBe(false);
  });
});
