/** Shaft flex options for IronCrest / Iron Lake golf club set rentals. */

export const GOLF_CLUB_FLEXES = ["Ladies", "Senior", "Regular", "Stiff"] as const;

export type GolfClubFlex = (typeof GOLF_CLUB_FLEXES)[number];

export type FlexInventoryOption = {
  flex: GolfClubFlex;
  /** Total sets of this flex in club inventory. */
  inventory: number;
};

/** Default IronCrest golf-shop inventory by shaft flex. */
export const IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY: FlexInventoryOption[] = [
  { flex: "Ladies", inventory: 2 },
  { flex: "Senior", inventory: 3 },
  { flex: "Regular", inventory: 6 },
  { flex: "Stiff", inventory: 4 },
];

export const IRON_LAKE_GOLF_CLUBS_ITEM_ID = "il-golf-clubs";

export function isGolfClubFlex(value: string): value is GolfClubFlex {
  return (GOLF_CLUB_FLEXES as readonly string[]).includes(value);
}

export function inventoryForFlex(
  options: FlexInventoryOption[],
  flex: string,
): number | null {
  const row = options.find((o) => o.flex === flex);
  return row ? row.inventory : null;
}

/** Inclusive YYYY-MM-DD windows overlap when startA <= endB && startB <= endA. */
export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Inclusive end date for a rental starting on startDate lasting `days` days. */
export function rentalEndDate(startDate: string, days: number): string {
  const n = Math.max(1, Math.floor(days));
  return addDaysIso(startDate, n - 1);
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function countOverlappingFlexRentals<
  T extends { startDate: string | null; endDate: string | null; days: number; createdAt: Date; status: string },
>(
  rentals: T[],
  startDate: string,
  endDate: string,
): number {
  return rentals.filter((r) => {
    if (r.status === "cancelled" || r.status === "returned") return false;
    const rStart = r.startDate ?? r.createdAt.toISOString().slice(0, 10);
    const rEnd = r.endDate ?? rentalEndDate(rStart, r.days);
    return dateRangesOverlap(startDate, endDate, rStart, rEnd);
  }).length;
}

export type FlexAvailability = {
  flex: GolfClubFlex;
  inventory: number;
  reserved: number;
  remaining: number;
};

export function computeFlexAvailability(
  options: FlexInventoryOption[],
  reservedByFlex: Record<string, number>,
): FlexAvailability[] {
  return options.map((o) => {
    const reserved = reservedByFlex[o.flex] ?? 0;
    return {
      flex: o.flex,
      inventory: o.inventory,
      reserved,
      remaining: Math.max(0, o.inventory - reserved),
    };
  });
}
