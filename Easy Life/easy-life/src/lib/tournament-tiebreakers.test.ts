import { describe, expect, it } from "vitest";
import { buildRounds } from "@/lib/tournament-bracket";
import {
  buildPlayerStandingStats,
  sortStandingsWithTiebreakers,
  tiebreakerLabel,
  type PlayerStandingStats,
} from "@/lib/tournament-tiebreakers";

describe("tiebreakerLabel", () => {
  it("labels decider options", () => {
    expect(tiebreakerLabel("head_to_head")).toBe("Head-to-head result");
    expect(tiebreakerLabel("set_percentage")).toBe("Set record / set percentage");
    expect(tiebreakerLabel("game_percentage")).toBe("Game record / game percentage");
  });
});

describe("sortStandingsWithTiebreakers", () => {
  const rounds: ReturnType<typeof buildRounds> = [];
  const winners: Record<string, string> = {};

  it("ranks equal-win players by set percentage", () => {
    const tied: PlayerStandingStats[] = [
      {
        name: "Alpha",
        wins: 1,
        eliminated: true,
        setsWon: 4,
        setsLost: 2,
        gamesWon: 30,
        gamesLost: 24,
      },
      {
        name: "Beta",
        wins: 1,
        eliminated: true,
        setsWon: 2,
        setsLost: 3,
        gamesWon: 28,
        gamesLost: 30,
      },
    ];
    const rows = sortStandingsWithTiebreakers(
      tied,
      ["set_percentage", "head_to_head", "game_percentage"],
      rounds,
      winners,
    );
    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Beta"]);
  });

  it("ranks equal-win players by game percentage when configured second", () => {
    const tied: PlayerStandingStats[] = [
      {
        name: "Alpha",
        wins: 1,
        eliminated: true,
        setsWon: 2,
        setsLost: 2,
        gamesWon: 40,
        gamesLost: 30,
      },
      {
        name: "Beta",
        wins: 1,
        eliminated: true,
        setsWon: 2,
        setsLost: 2,
        gamesWon: 32,
        gamesLost: 38,
      },
    ];
    const rows = sortStandingsWithTiebreakers(
      tied,
      ["head_to_head", "game_percentage", "set_percentage"],
      rounds,
      winners,
    );
    expect(rows.map((r) => r.name)).toEqual(["Alpha", "Beta"]);
  });

  it("accumulates set and game totals from match scores", () => {
    const seeds = ["Alice", "Bob", "Carol", "Dave"];
    const tid = "t1";
    const matchWinners = {
      "t1-r0-m0": "Alice",
      "t1-r0-m1": "Carol",
    };
    const bracketRounds = buildRounds(tid, seeds, matchWinners);
    const scores = {
      matches: {
        "t1-r0-m0": { sets: { p1: ["6", "6"], p2: ["4", "3"] } },
        "t1-r0-m1": { sets: { p1: ["7", "6"], p2: ["5", "4"] } },
      },
      leaderboard: {},
    };
    const stats = buildPlayerStandingStats(seeds, matchWinners, bracketRounds, scores);
    expect(stats.get("Alice")?.setsWon).toBe(2);
    expect(stats.get("Bob")?.gamesLost).toBeGreaterThan(0);
    expect(stats.get("Carol")?.wins).toBe(1);
  });
});
