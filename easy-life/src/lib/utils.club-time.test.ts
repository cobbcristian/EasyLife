import { describe, expect, it } from "vitest";
import {
  clubDateKey,
  clubDateTimeToUtc,
  clubMinutesNow,
  isOpenSchedule,
  isUpcomingItem,
} from "@/lib/utils";

describe("club timezone helpers", () => {
  it("maps Eastern wall times to the correct UTC instant (EDT and EST)", () => {
    expect(clubDateTimeToUtc("2026-07-12", "18:00").toISOString()).toBe(
      "2026-07-12T22:00:00.000Z",
    );
    expect(clubDateTimeToUtc("2026-01-12", "18:00").toISOString()).toBe(
      "2026-01-12T23:00:00.000Z",
    );
  });

  it("reads club calendar day and minutes from a UTC instant", () => {
    const afternoonUtc = new Date("2026-07-12T19:31:00.000Z"); // 15:31 EDT
    expect(clubDateKey(afternoonUtc)).toBe("2026-07-12");
    expect(clubMinutesNow(afternoonUtc)).toBe(15 * 60 + 31);
  });
});

describe("isUpcomingItem / isOpenSchedule on UTC hosts", () => {
  it("keeps an evening booking open through mid-afternoon UTC", () => {
    // 19:31 UTC = 15:31 EDT — host-local getHours() would already be past 19:30.
    const now = new Date("2026-07-12T19:31:00.000Z");
    expect(isUpcomingItem("2026-07-12", "18:00 – 19:30", now)).toBe(true);
    expect(isOpenSchedule("2026-07-12", "18:00", "19:30", now)).toBe(true);
  });

  it("marks the same booking ended only after the Eastern end time", () => {
    const now = new Date("2026-07-12T23:31:00.000Z"); // 19:31 EDT
    expect(isUpcomingItem("2026-07-12", "18:00 – 19:30", now)).toBe(false);
    expect(isOpenSchedule("2026-07-12", "18:00", "19:30", now)).toBe(false);
  });

  it("does not roll the club day at UTC midnight while Eastern evening continues", () => {
    // 00:30 UTC Jul 13 = 20:30 EDT Jul 12
    const now = new Date("2026-07-13T00:30:00.000Z");
    expect(clubDateKey(now)).toBe("2026-07-12");
    expect(isUpcomingItem("2026-07-12", "18:00 – 21:00", now)).toBe(true);
    expect(isUpcomingItem("2026-07-12", "18:00 – 20:00", now)).toBe(false);
  });
});
