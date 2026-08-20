import { describe, expect, it } from "vitest";
import { canMutateAmenityCommunity } from "@/lib/server/amenity-auth";

describe("canMutateAmenityCommunity", () => {
  it("allows platform super-admin (admin without community) any club amenity", () => {
    expect(
      canMutateAmenityCommunity(
        { role: "admin", communityId: null },
        "windsor",
      ),
    ).toBe(true);
  });

  it("allows club staff only for their own community amenities", () => {
    expect(
      canMutateAmenityCommunity(
        { role: "admin", communityId: "windsor" },
        "windsor",
      ),
    ).toBe(true);
    expect(
      canMutateAmenityCommunity(
        { role: "pm", communityId: "windsor" },
        "windsor",
      ),
    ).toBe(true);
    expect(
      canMutateAmenityCommunity(
        { role: "board", communityId: "windsor" },
        "windsor",
      ),
    ).toBe(true);
  });

  it("rejects club staff mutating another club's amenity", () => {
    expect(
      canMutateAmenityCommunity(
        { role: "admin", communityId: "oceanside-residents" },
        "windsor",
      ),
    ).toBe(false);
    expect(
      canMutateAmenityCommunity(
        { role: "pm", communityId: "oceanside-residents" },
        "windsor",
      ),
    ).toBe(false);
  });

  it("rejects members and providers", () => {
    expect(
      canMutateAmenityCommunity(
        { role: "member", communityId: "windsor" },
        "windsor",
      ),
    ).toBe(false);
    expect(
      canMutateAmenityCommunity(
        { role: "provider", communityId: "windsor" },
        "windsor",
      ),
    ).toBe(false);
  });
});
