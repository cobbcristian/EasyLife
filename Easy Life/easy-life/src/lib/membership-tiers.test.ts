import { describe, expect, it } from "vitest";
import {
  amenityKindToAccess,
  periodBounds,
  tierAllowsAmenity,
} from "@/lib/membership-tiers";

describe("membership tiers", () => {
  it("maps fitness center to gym access", () => {
    expect(amenityKindToAccess("facility", "Fitness Center")).toBe("gym");
    expect(amenityKindToAccess("driving_range")).toBe("driving_range");
  });

  it("gates tee times and courts by tier", () => {
    expect(tierAllowsAmenity("golf", "golf_course")).toBe(true);
    expect(tierAllowsAmenity("golf", "court")).toBe(false);
    expect(tierAllowsAmenity("social_tennis", "court")).toBe(true);
    expect(tierAllowsAmenity("social", "golf_course")).toBe(false);
    expect(tierAllowsAmenity("national", "court")).toBe(true);
  });

  it("computes monthly F&B period bounds", () => {
    const { start, end } = periodBounds("monthly", new Date("2026-07-18T12:00:00"));
    expect(start).toBe("2026-07-01");
    expect(end).toBe("2026-07-31");
  });

  it("gates Iron Lake Full Golf on courts and golf", () => {
    expect(tierAllowsAmenity("full_golf", "golf_course", undefined, undefined, "iron-lake")).toBe(
      true,
    );
    expect(tierAllowsAmenity("full_golf", "court", undefined, undefined, "iron-lake")).toBe(true);
    expect(tierAllowsAmenity("social_dining", "golf_course", undefined, undefined, "iron-lake")).toBe(
      false,
    );
    expect(tierAllowsAmenity("social_dining", "spa", undefined, undefined, "iron-lake")).toBe(false);
    expect(tierAllowsAmenity("social_plus_sports", "court", undefined, undefined, "iron-lake")).toBe(
      true,
    );
    expect(
      tierAllowsAmenity("social_plus_sports", "golf_course", undefined, undefined, "iron-lake"),
    ).toBe(true);
  });
});
