import { describe, expect, it } from "vitest";
import { providerRefundListWhere } from "@/lib/server/refunds";

describe("providerRefundListWhere", () => {
  it("scopes unassigned refunds to the provider's club", () => {
    const where = providerRefundListWhere("pro@club-a.com", "club-a");
    expect(where.communityId).toBe("club-a");
    expect(where.OR).toEqual([
      { providerEmail: "pro@club-a.com" },
      { providerEmail: null },
    ]);
  });

  it("normalizes provider email before matching", () => {
    const where = providerRefundListWhere("  Pro@Club-A.com ", "club-a");
    expect(where.OR[0]).toEqual({ providerEmail: "pro@club-a.com" });
  });

  it("keeps communityId when including unassigned (null provider) rows", () => {
    const where = providerRefundListWhere("pro@club-a.com", "club-b");
    expect(where.communityId).toBe("club-b");
    expect(where.OR).toContainEqual({ providerEmail: null });
  });
});
