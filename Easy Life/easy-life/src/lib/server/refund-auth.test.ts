import { describe, expect, it } from "vitest";
import { canActorResolveRefund } from "@/lib/server/refund-auth";

describe("canActorResolveRefund", () => {
  const refund = {
    providerEmail: "pro@example.com",
    communityId: "club-a",
  };

  it("allows the assigned provider", () => {
    expect(
      canActorResolveRefund(
        { role: "provider", email: "pro@example.com", communityId: "club-a" },
        refund,
      ),
    ).toBe(true);
  });

  it("rejects another provider (IDOR)", () => {
    expect(
      canActorResolveRefund(
        { role: "provider", email: "other@example.com", communityId: "club-a" },
        refund,
      ),
    ).toBe(false);
  });

  it("rejects provider when refund has no providerEmail", () => {
    expect(
      canActorResolveRefund(
        { role: "provider", email: "pro@example.com" },
        { providerEmail: null, communityId: "club-a" },
      ),
    ).toBe(false);
  });

  it("allows club admin for same community", () => {
    expect(
      canActorResolveRefund(
        { role: "admin", email: "admin@club-a.com", communityId: "club-a" },
        refund,
      ),
    ).toBe(true);
  });

  it("rejects club admin for another community", () => {
    expect(
      canActorResolveRefund(
        { role: "admin", email: "admin@club-b.com", communityId: "club-b" },
        refund,
      ),
    ).toBe(false);
  });

  it("allows super-admin with no community scope", () => {
    expect(
      canActorResolveRefund(
        { role: "admin", email: "root@easylife.app", communityId: null },
        refund,
      ),
    ).toBe(true);
  });

  it("rejects members", () => {
    expect(
      canActorResolveRefund(
        { role: "member", email: "member@example.com", communityId: "club-a" },
        refund,
      ),
    ).toBe(false);
  });
});
