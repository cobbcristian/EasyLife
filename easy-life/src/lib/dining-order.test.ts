import { describe, expect, it } from "vitest";
import {
  assignTableLabel,
  computeReadyBy,
  diningConfirmationMessage,
  estimateCookMinutes,
  normalizeDiningFulfillment,
  subtractMinutesFromTime,
} from "@/lib/dining-order";

describe("dining order ahead", () => {
  it("normalizes fulfillment modes", () => {
    expect(normalizeDiningFulfillment("eat_in")).toBe("eat_in");
    expect(normalizeDiningFulfillment("dine-in")).toBe("eat_in");
    expect(normalizeDiningFulfillment("pickup")).toBe("takeout");
    expect(normalizeDiningFulfillment("delivery")).toBe("delivery");
  });

  it("times food ready for arrival", () => {
    const eatIn = computeReadyBy({
      fulfillment: "eat_in",
      arriveTime: "19:00",
      itemCount: 3,
    });
    expect(eatIn.readyBy).toBe("19:00");
    expect(eatIn.kitchenStartBy).toBe(subtractMinutesFromTime("19:00", eatIn.cookMinutes));

    const takeout = computeReadyBy({
      fulfillment: "takeout",
      arriveTime: "12:30",
      itemCount: 2,
    });
    expect(takeout.readyBy).toBe("12:30");
  });

  it("assigns tables by existing reservations", () => {
    expect(assignTableLabel({ existingCount: 0, partySize: 2 })).toBe("Table 1");
    expect(assignTableLabel({ existingCount: 3, partySize: 8 })).toBe("Table 4 (large)");
  });

  it("writes clear eat-in confirmation", () => {
    const msg = diningConfirmationMessage({
      fulfillment: "eat_in",
      restaurant: "The Terrace Restaurant",
      arriveDate: "2026-07-18",
      arriveTime: "19:00",
      readyBy: "19:00",
      tableLabel: "Table 2",
      partySize: 4,
    });
    expect(msg).toContain("Table 2");
    expect(msg).toContain("19:00");
    expect(msg).toContain("The Terrace Restaurant");
  });

  it("estimates cook time from cart size", () => {
    expect(estimateCookMinutes(1)).toBeGreaterThanOrEqual(12);
    expect(estimateCookMinutes(20)).toBeLessThanOrEqual(45);
  });
});
