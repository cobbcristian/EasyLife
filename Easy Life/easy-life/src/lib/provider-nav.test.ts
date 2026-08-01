import { describe, expect, it } from "vitest";
import {
  providerShowsActivities,
  providerShowsGroupClinics,
} from "@/lib/provider-nav";

describe("providerShowsGroupClinics", () => {
  it("hides clinics for IronCrest lawn (local_pro)", () => {
    expect(
      providerShowsGroupClinics({
        email: "lawn@ironcrest.services",
        listingKind: "local_pro",
        category: "Lawn Maintenance",
        type: "service",
      }),
    ).toBe(false);
  });

  it("hides clinics for lawn category even if listingKind is club", () => {
    expect(
      providerShowsGroupClinics({
        email: "lawn@bonitabayclub.net",
        listingKind: "club",
        category: "Lawn Care",
        type: "service",
      }),
    ).toBe(false);
  });

  it("shows clinics for tennis instructors", () => {
    expect(
      providerShowsGroupClinics({
        email: "tennis@ironcrest.com",
        listingKind: "club",
        category: "Tennis",
        type: "activity",
      }),
    ).toBe(true);
  });
});

describe("providerShowsActivities", () => {
  it("hides activities for local pros", () => {
    expect(
      providerShowsActivities({
        email: "lawn@ironcrest.services",
        listingKind: "local_pro",
        category: "Lawn Maintenance",
        type: "service",
      }),
    ).toBe(false);
  });
});
