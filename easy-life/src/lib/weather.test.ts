import { describe, expect, it } from "vitest";
import {
  easternDateOffset,
  isRainAdvisoryActive,
  isRainSensitiveAmenity,
  lightsDefaultOn,
  normalizeCourtAddons,
  parseWeatherJson,
  rainClosureMessage,
} from "@/lib/weather";

describe("lightsDefaultOn (Ocala dusk rule)", () => {
  it("defaults lights on after 18:00 and before 07:00", () => {
    expect(lightsDefaultOn("18:00")).toBe(true);
    expect(lightsDefaultOn("19:30")).toBe(true);
    expect(lightsDefaultOn("06:30")).toBe(true);
    expect(lightsDefaultOn("00:00")).toBe(true);
  });

  it("defaults lights off during daylight", () => {
    expect(lightsDefaultOn("07:00")).toBe(false);
    expect(lightsDefaultOn("10:00")).toBe(false);
    expect(lightsDefaultOn("17:59")).toBe(false);
  });
});

describe("rain advisory", () => {
  it("parses weather json", () => {
    const w = parseWeatherJson(
      JSON.stringify({
        rainAdvisories: [{ date: "2026-07-20", active: true }],
      }),
    );
    expect(isRainAdvisoryActive(w, "2026-07-20")).toBe(true);
    expect(isRainAdvisoryActive(w, "2026-07-19")).toBe(false);
  });

  it("treats rainUntil as a single wet date", () => {
    const w = parseWeatherJson(JSON.stringify({ rainUntil: "2026-07-21" }));
    expect(isRainAdvisoryActive(w, "2026-07-20")).toBe(false);
    expect(isRainAdvisoryActive(w, "2026-07-21")).toBe(true);
    expect(isRainAdvisoryActive(w, "2026-07-22")).toBe(false);
  });

  it("scopes outdoor amenities and messages", () => {
    expect(isRainSensitiveAmenity("court")).toBe(true);
    expect(isRainSensitiveAmenity("golf_course")).toBe(true);
    expect(isRainSensitiveAmenity("driving_range")).toBe(true);
    expect(isRainSensitiveAmenity("spa")).toBe(false);
    expect(rainClosureMessage("court")).toMatch(/wet after rain/i);
    expect(rainClosureMessage("golf_course")).toMatch(/golf course/i);
  });

  it("normalizes court add-ons", () => {
    expect(normalizeCourtAddons(["balls", "lights", "balls", "nope"])).toEqual([
      "balls",
      "lights",
    ]);
  });

  it("uses Eastern calendar for demo rain day", () => {
    const tomorrow = easternDateOffset(1);
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
