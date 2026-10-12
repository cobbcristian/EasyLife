import { describe, expect, it } from "vitest";
import { noStartWinnerName, noStartWinnerSide } from "@/lib/tournament-no-start";

describe("noStartWinnerSide", () => {
  const match = { p1: "Alice", p2: "Bob" };
  const seeds = ["Alice", "Bob", "Carol", "Dave"];

  it("returns null for manual policy", () => {
    expect(noStartWinnerSide(match, seeds, "manual")).toBeNull();
  });

  it("picks higher seed", () => {
    expect(noStartWinnerSide(match, seeds, "higher_seed")).toBe("p1");
    expect(noStartWinnerName(match, seeds, "higher_seed")).toBe("Alice");
  });

  it("picks lower seed", () => {
    expect(noStartWinnerSide(match, seeds, "lower_seed")).toBe("p2");
    expect(noStartWinnerName(match, seeds, "lower_seed")).toBe("Bob");
  });
});
