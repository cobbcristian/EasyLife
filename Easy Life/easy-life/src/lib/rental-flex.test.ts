import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  computeFlexAvailability,
  countOverlappingFlexRentals,
  dateRangesOverlap,
  IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY,
  rentalEndDate,
} from "@/lib/rental-flex";

describe("rental-flex inventory", () => {
  it("uses default IronCrest flex inventory counts", () => {
    expect(IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY).toEqual([
      { flex: "Ladies", inventory: 2 },
      { flex: "Senior", inventory: 3 },
      { flex: "Regular", inventory: 6 },
      { flex: "Stiff", inventory: 4 },
    ]);
  });

  it("detects inclusive date overlaps", () => {
    expect(dateRangesOverlap("2026-07-19", "2026-07-21", "2026-07-21", "2026-07-22")).toBe(true);
    expect(dateRangesOverlap("2026-07-19", "2026-07-20", "2026-07-21", "2026-07-22")).toBe(false);
  });

  it("computes inclusive end dates from day count", () => {
    expect(rentalEndDate("2026-07-19", 1)).toBe("2026-07-19");
    expect(rentalEndDate("2026-07-19", 3)).toBe("2026-07-21");
    expect(addDaysIso("2026-07-30", 2)).toBe("2026-08-01");
  });

  it("counts overlapping flex rentals and remaining inventory", () => {
    const rentals = [
      {
        startDate: "2026-07-19",
        endDate: "2026-07-20",
        days: 2,
        createdAt: new Date("2026-07-18T12:00:00Z"),
        status: "reserved",
      },
      {
        startDate: "2026-07-21",
        endDate: "2026-07-22",
        days: 2,
        createdAt: new Date("2026-07-18T12:00:00Z"),
        status: "reserved",
      },
      {
        startDate: "2026-07-19",
        endDate: "2026-07-19",
        days: 1,
        createdAt: new Date("2026-07-18T12:00:00Z"),
        status: "cancelled",
      },
    ];
    expect(countOverlappingFlexRentals(rentals, "2026-07-20", "2026-07-21")).toBe(2);
    const availability = computeFlexAvailability(IRON_LAKE_GOLF_CLUB_FLEX_INVENTORY, {
      Regular: 2,
      Stiff: 4,
    });
    expect(availability.find((a) => a.flex === "Regular")).toMatchObject({
      inventory: 6,
      reserved: 2,
      remaining: 4,
    });
    expect(availability.find((a) => a.flex === "Stiff")).toMatchObject({
      remaining: 0,
    });
  });
});
