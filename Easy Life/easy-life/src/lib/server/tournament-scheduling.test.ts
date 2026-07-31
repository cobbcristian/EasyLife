import { describe, expect, it } from "vitest";
import { buildAllMatches } from "@/lib/server/tournament-scheduling";

describe("buildAllMatches", () => {
  it("builds bracket match ids", () => {
    const matches = buildAllMatches("t1", ["A", "B", "C", "D"], {});
    expect(matches.some((m) => m.id === "t1-r0-m0")).toBe(true);
    expect(matches.some((m) => m.id === "t1-r1-m0")).toBe(true);
  });
});
