import { describe, expect, it } from "vitest";
import {
  defaultDailyHoursWithClosed,
  hoursClosedMessage,
  isOpenAt,
  parseWeeklyHours,
  weekdayHours,
} from "@/lib/hours";

describe("hours of operation", () => {
  const hours = weekdayHours("07:00", "21:00", "08:00", "18:00");

  it("parses weekly hours json", () => {
    expect(parseWeeklyHours(JSON.stringify(hours))?.mon?.open).toBe("07:00");
  });

  it("allows booking inside open window", () => {
    // 2026-07-20 is a Monday
    expect(isOpenAt(hours, "2026-07-20", "09:00", "10:00")).toBe(true);
    expect(isOpenAt(hours, "2026-07-20", "20:30", "21:30")).toBe(false);
  });
});

describe("mid-day irrigation closed windows", () => {
  const tennis = defaultDailyHoursWithClosed("09:00", "17:00", [
    {
      start: "12:00",
      end: "13:30",
      reason: "Above-ground irrigation and green-clay dry-down",
    },
  ]);

  it("blocks booking during watering and dry-down", () => {
    expect(isOpenAt(tennis, "2026-07-20", "11:00", "12:00")).toBe(true);
    expect(isOpenAt(tennis, "2026-07-20", "12:00", "13:00")).toBe(false);
    expect(isOpenAt(tennis, "2026-07-20", "12:30", "13:00")).toBe(false);
    expect(isOpenAt(tennis, "2026-07-20", "13:00", "14:00")).toBe(false);
    expect(isOpenAt(tennis, "2026-07-20", "13:30", "14:30")).toBe(true);
  });

  it("explains irrigation closure in message", () => {
    const msg = hoursClosedMessage(tennis, "2026-07-20", "12:00", "13:00");
    expect(msg).toMatch(/irrigation/i);
    expect(msg).toMatch(/12:00/);
  });
});
