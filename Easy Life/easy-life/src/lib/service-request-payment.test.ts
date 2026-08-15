import { describe, expect, it } from "vitest";
import { canCompleteServiceRequestPayment } from "@/lib/service-request-payment";

describe("canCompleteServiceRequestPayment", () => {
  it("allows the owning member to complete their request", () => {
    expect(
      canCompleteServiceRequestPayment({
        requestMemberEmail: "jane@example.com",
        sessionEmail: "Jane@example.com",
        requestCommunityId: "oceanside-residents",
        sessionCommunityId: "oceanside-residents",
      }),
    ).toBe(true);
  });

  it("blocks other members from completing someone else's request", () => {
    expect(
      canCompleteServiceRequestPayment({
        requestMemberEmail: "owner@example.com",
        sessionEmail: "attacker@example.com",
        requestCommunityId: "oceanside-residents",
        sessionCommunityId: "oceanside-residents",
      }),
    ).toBe(false);
  });

  it("blocks cross-community completion even with matching email casing", () => {
    expect(
      canCompleteServiceRequestPayment({
        requestMemberEmail: "jane@example.com",
        sessionEmail: "jane@example.com",
        requestCommunityId: "club-a",
        sessionCommunityId: "club-b",
      }),
    ).toBe(false);
  });
});
