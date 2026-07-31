import { describe, expect, it } from "vitest";
import { addMinutes } from "@/lib/server/tournament-bookings";

describe("tournament court bookings", () => {
  it("addMinutes computes end of match slot", () => {
    expect(addMinutes("10:00", 90)).toBe("11:30");
    expect(addMinutes("23:00", 90)).toBe("00:30");
  });
});
