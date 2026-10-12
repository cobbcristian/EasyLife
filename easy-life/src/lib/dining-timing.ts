/** Category-aware cook time (minutes). */
export function categoryCookWeight(categoryOrName: string): number {
  const s = categoryOrName.toLowerCase();
  if (/(drink|tea|soda|coffee|juice|water|beer|wine)/.test(s)) return 2;
  if (/(dessert|pie|cake|ice cream)/.test(s)) return 5;
  if (/(starter|salad|soup|appetizer|bisque)/.test(s)) return 8;
  if (/(sandwich|burger|club)/.test(s)) return 12;
  if (/(salmon|steak|grill|entree|main)/.test(s)) return 18;
  return 10;
}

export type DiningLineInput = {
  name: string;
  qty?: number;
  category?: string;
};

/**
 * Estimate kitchen minutes from item mix, party size, and optional historical avg.
 */
export function estimateCookMinutesFromOrder(input: {
  items: DiningLineInput[];
  partySize?: number | null;
  historicalAvgMinutes?: number | null;
}): number {
  const lines = input.items.length
    ? input.items
    : [{ name: "item", qty: 1 }];
  let weighted = 0;
  let units = 0;
  for (const line of lines) {
    const qty = Math.max(1, Number(line.qty) || 1);
    const w = categoryCookWeight(line.category ?? line.name);
    weighted += w * qty;
    units += qty;
  }
  const base = units > 0 ? weighted / Math.max(1, Math.sqrt(units)) : 15;
  const partyBump =
    input.partySize && input.partySize > 2
      ? Math.min(12, (input.partySize - 2) * 2)
      : 0;
  let minutes = base + partyBump;
  if (
    input.historicalAvgMinutes != null &&
    input.historicalAvgMinutes > 0
  ) {
    minutes = minutes * 0.65 + input.historicalAvgMinutes * 0.35;
  }
  return Math.min(45, Math.max(12, Math.round(minutes)));
}

/** Fallback when only a count is known (legacy callers). */
export function estimateCookMinutes(itemCount: number): number {
  const n = Math.max(1, itemCount);
  return estimateCookMinutesFromOrder({
    items: Array.from({ length: n }, (_, i) => ({ name: `item-${i}`, qty: 1 })),
  });
}
