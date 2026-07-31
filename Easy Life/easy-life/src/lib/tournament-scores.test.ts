import { describe, expect, it } from "vitest";
import {
  formatTennisSetsFromBoxes,
  parseTennisMatchScore,
  resolveTennisMatchWinner,
  visibleTennisSetColumns,
} from "./tournament-scores";

describe("formatTennisSetsFromBoxes", () => {
  it("builds score string from set boxes", () => {
    expect(
      formatTennisSetsFromBoxes({
        p1: ["7", "5", "7"],
        p2: ["5", "7", "6"],
      }),
    ).toBe("7-5, 5-7, 7-6");
  });
});

describe("resolveTennisMatchWinner", () => {
  it("uses status winner for retirements", () => {
    expect(
      resolveTennisMatchWinner(
        { p1: "Alice", p2: "Bob" },
        { matchStatus: "retirement", statusWinner: "p1", statusDetail: "Injury" },
        "Standard",
      ),
    ).toEqual({ winner: "Alice", complete: true });
  });

  it("uses status winner for complete matches", () => {
    expect(
      resolveTennisMatchWinner(
        { p1: "Alice", p2: "Bob" },
        { matchStatus: "complete", statusWinner: "p2" },
        "Standard",
      ),
    ).toEqual({ winner: "Bob", complete: true });
  });

  it("uses score when complete status has no manual winner", () => {
    expect(
      resolveTennisMatchWinner(
        { p1: "Alice", p2: "Bob" },
        { matchStatus: "complete", score: "6-4, 6-3" },
        "Standard",
      ),
    ).toEqual({ winner: "Alice", complete: true });
  });

  it("uses status winner for did not start", () => {
    expect(
      resolveTennisMatchWinner(
        { p1: "Alice", p2: "Bob" },
        { matchStatus: "did_not_start", statusWinner: "p1" },
        "Standard",
      ),
    ).toEqual({ winner: "Alice", complete: true });
  });
});

describe("tennisMatchNeedsWinnerPick", () => {
  it("does not ask when score decides the match", async () => {
    const { tennisMatchNeedsWinnerPick } = await import("./tournament-scores");
    expect(tennisMatchNeedsWinnerPick("walkover", "6-4, 6-3", "Standard", null)).toBe(false);
    expect(tennisMatchNeedsWinnerPick("retirement", "6-4, 6-3", "Standard", null)).toBe(false);
  });

  it("asks for walkover without score", async () => {
    const { tennisMatchNeedsWinnerPick } = await import("./tournament-scores");
    expect(tennisMatchNeedsWinnerPick("walkover", "", "Standard", null)).toBe(true);
  });

  it("does not ask for complete or none", async () => {
    const { tennisMatchNeedsWinnerPick } = await import("./tournament-scores");
    expect(tennisMatchNeedsWinnerPick("complete", "6-4, 6-3", "Standard", null)).toBe(false);
    expect(tennisMatchNeedsWinnerPick("none", "6-4, 6-3", "Standard", null)).toBe(false);
  });
});

describe("visibleTennisSetColumns", () => {
  it("shows two sets by default", () => {
    expect(
      visibleTennisSetColumns(
        { p1: ["", ""], p2: ["", ""] },
        "Standard",
      ),
    ).toBe(2);
  });

  it("shows third set when first two sets are split", () => {
    expect(
      visibleTennisSetColumns(
        { p1: ["6", "4", ""], p2: ["4", "6", ""] },
        "Standard",
      ),
    ).toBe(3);
  });

  it("stays at two sets when player wins in straight sets", () => {
    expect(
      visibleTennisSetColumns(
        { p1: ["6", "6", ""], p2: ["4", "3", ""] },
        "Standard",
      ),
    ).toBe(2);
  });
});

describe("deriveTennisWinners with existing winners", () => {
  it("keeps stored winners when scores are empty", async () => {
    const { deriveTennisWinners } = await import("./tournament-scores");
    const winners = deriveTennisWinners(
      "t1",
      ["A", "B", "C", "D", "E", "F", "G", "H"],
      "Standard",
      { matches: {}, leaderboard: {} },
      { "t1-r0-m0": "A" },
    );
    expect(winners["t1-r0-m0"]).toBe("A");
  });
});

describe("parseTennisMatchScore", () => {
  it("returns p1 when two sets won", () => {
    expect(parseTennisMatchScore("6-4, 6-3", "Standard")).toEqual({
      winnerSide: "p1",
      complete: true,
    });
  });

  it("parses space-separated sets", () => {
    expect(parseTennisMatchScore("6-4 6-3", "Standard")).toEqual({
      winnerSide: "p1",
      complete: true,
    });
  });

  it("returns p2 after split sets", () => {
    expect(parseTennisMatchScore("6-4, 4-6, 3-6", "Standard")).toEqual({
      winnerSide: "p2",
      complete: true,
    });
  });

  it("is incomplete with only one set", () => {
    expect(parseTennisMatchScore("6-4", "Standard")).toEqual({
      winnerSide: null,
      complete: false,
    });
  });

  it("is incomplete when empty", () => {
    expect(parseTennisMatchScore("", "Standard")).toEqual({
      winnerSide: null,
      complete: false,
    });
  });
});
