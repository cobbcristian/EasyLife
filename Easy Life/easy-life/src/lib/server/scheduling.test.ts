import { describe, expect, it } from "vitest";
import {
  assignUnitNumber,
  countOverlappingBookings,
  timeRangesOverlap,
} from "@/lib/scheduling";

describe("timeRangesOverlap", () => {
  it("detects overlap", () => {
    expect(timeRangesOverlap("10:00", "11:00", "10:30", "11:30")).toBe(true);
  });
  it("allows adjacent slots", () => {
    expect(timeRangesOverlap("10:00", "11:00", "11:00", "12:00")).toBe(false);
  });
});

describe("countOverlappingBookings", () => {
  it("ignores cancelled", () => {
    const n = countOverlappingBookings(
      [{ startTime: "10:00", endTime: "11:00", status: "cancelled" }],
      "10:00",
      "11:00",
    );
    expect(n).toBe(0);
  });
});

describe("assignUnitNumber", () => {
  it("picks first free court", () => {
    const unit = assignUnitNumber(
      2,
      [{ startTime: "10:00", endTime: "11:00", status: "confirmed", unitNumber: 1 }],
      "10:00",
      "11:00",
    );
    expect(unit).toBe(2);
  });

  it("honors a preferred free court", () => {
    const unit = assignUnitNumber(
      7,
      [{ startTime: "10:00", endTime: "11:00", status: "confirmed", unitNumber: 1 }],
      "10:00",
      "11:00",
      3,
    );
    expect(unit).toBe(3);
  });

  it("rejects a preferred court that is taken", () => {
    const unit = assignUnitNumber(
      7,
      [{ startTime: "10:00", endTime: "11:00", status: "confirmed", unitNumber: 3 }],
      "10:00",
      "11:00",
      3,
    );
    expect(unit).toBeNull();
  });
});
