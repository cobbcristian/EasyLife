import { describe, expect, it } from "vitest";
import {
  estimateCookMinutesFromOrder,
  categoryCookWeight,
} from "@/lib/dining-timing";
import { matchProductHeuristic } from "@/lib/server/ai/grab-go-vision";
import { moderatePhotoHeuristic } from "@/lib/server/ai/photo-moderate";
import { summarizeInboxHeuristic } from "@/lib/server/ai/inbox-summary";
import { scoreGenericDocument } from "@/lib/server/ai/doc-verify";
import { scoreLevel } from "@/lib/server/ai/types";
import { computeReadyBy } from "@/lib/dining-order";

describe("ai suite heuristics", () => {
  it("weights mains heavier than drinks for cook time", () => {
    expect(categoryCookWeight("Iced Tea")).toBeLessThan(categoryCookWeight("Grilled Salmon"));
    const drinks = estimateCookMinutesFromOrder({
      items: [{ name: "Iced Tea", qty: 2, category: "Drinks" }],
    });
    const mains = estimateCookMinutesFromOrder({
      items: [{ name: "Grilled Salmon", qty: 2, category: "Mains" }],
      partySize: 4,
    });
    expect(mains).toBeGreaterThan(drinks);
  });

  it("times eat-in ready-by at arrival with smarter cook minutes", () => {
    const result = computeReadyBy({
      fulfillment: "eat_in",
      arriveTime: "19:00",
      itemCount: 2,
      items: [
        { name: "Clubhouse Burger", qty: 1 },
        { name: "Iced Tea", qty: 1 },
      ],
      partySize: 2,
    });
    expect(result.readyBy).toBe("19:00");
    expect(result.cookMinutes).toBeGreaterThanOrEqual(12);
  });

  it("matches grab-go products from camera notes", () => {
    const match = matchProductHeuristic("took a sparkling water from shelf", [
      { sku: "WATER-500", name: "Sparkling Water", category: "drinks" },
      { sku: "CHIP-SEA", name: "Sea Salt Chips", category: "snacks" },
    ]);
    expect(match?.sku).toBe("WATER-500");
    expect(match!.confidence).toBeGreaterThan(0.5);
  });

  it("blocks unsafe marketplace captions", () => {
    const bad = moderatePhotoHeuristic({ title: "nsfw dump", caption: "xxx" });
    expect(bad.allowed).toBe(false);
    const ok = moderatePhotoHeuristic({ title: "Patio set", caption: "Gently used" });
    expect(ok.allowed).toBe(true);
  });

  it("summarizes inbox titles", () => {
    const s = summarizeInboxHeuristic([
      { title: "Dependent notice", body: "Age out soon" },
      { title: "Court SMS", body: "Court 3" },
    ]);
    expect(s).toContain("2 notices");
    expect(s).toContain("Dependent notice");
  });

  it("scores generic ID documents", () => {
    const result = scoreGenericDocument(
      { memberName: "Sarah Mitchell", memberEmail: "sarah@example.com" },
      "Driver License Sarah Mitchell Florida",
    );
    expect(result.score).toBeGreaterThan(40);
    expect(scoreLevel(80)).toBe("high");
  });
});
