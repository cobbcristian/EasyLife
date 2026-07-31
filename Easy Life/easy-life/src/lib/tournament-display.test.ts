import { describe, expect, it } from "vitest";
import {
  findNextMatchForPlayer,
  formatMatchSlot,
  formatTennisCourt,
  formatTennisCourtSmsBody,
  tennisCourtNumber,
} from "@/lib/tournament-display";

describe("tournament display", () => {
  const slot = {
    time: "10:00",
    date: "2026-06-24",
    unitNumber: 3,
    courtLabel: "Court 3 · hard",
  };

  it("extracts tennis court number from unitNumber or label", () => {
    expect(tennisCourtNumber(slot)).toBe(3);
    expect(tennisCourtNumber({ time: "09:00", date: "2026-06-24", courtLabel: "Court 7" })).toBe(7);
  });

  it("formats tennis court label prominently", () => {
    expect(formatTennisCourt(slot)).toBe("Court 3");
  });

  it("puts court number first for tennis match slots", () => {
    expect(formatMatchSlot(slot, "tennis")).toBe("Court 3 · hard · 10:00");
  });

  it("keeps time-first layout for non-tennis sports", () => {
    expect(formatMatchSlot(slot, "pickleball")).toBe("10:00 · Court 3 · hard");
  });

  it("builds SMS body with court number", () => {
    expect(
      formatTennisCourtSmsBody({
        tournamentTitle: "Summer Open",
        playerName: "Sarah",
        opponent: "Mike",
        courtNumber: 3,
        time: "10:00",
        date: "2026-06-24",
      }),
    ).toContain("Court 3");
  });

  it("picks the soonest scheduled unfinished match for a player", () => {
    const next = findNextMatchForPlayer(
      [
        [
          { id: "m-late", p1: "Sarah", p2: "Alex" },
          { id: "m-soon", p1: "Sarah", p2: "Mike" },
        ],
      ],
      {},
      "Sarah",
      {
        "m-late": { time: "14:00", date: "2026-06-24", unitNumber: 2, courtLabel: "Court 2" },
        "m-soon": { time: "10:00", date: "2026-06-24", unitNumber: 3, courtLabel: "Court 3" },
      },
      "tennis",
    );
    expect(next?.matchId).toBe("m-soon");
    expect(next?.courtNumber).toBe(3);
    expect(next?.opponent).toBe("Mike");
  });
});
