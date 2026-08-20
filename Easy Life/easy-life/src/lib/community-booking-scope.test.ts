import { describe, expect, it } from "vitest";
import { communityIdForServiceBooking } from "@/lib/communities-data";

describe("communityIdForServiceBooking", () => {
  it("maps Golden Ocala sample booking ids to golden-ocala", () => {
    expect(communityIdForServiceBooking("sb1")).toBe("golden-ocala");
  });

  it("maps Iron Lake booking ids to iron-lake", () => {
    expect(communityIdForServiceBooking("il-sb1")).toBe("iron-lake");
  });

  it("parses remapped demo ids as {community}-{baseId}", () => {
    expect(communityIdForServiceBooking("heritage-bay-sb1")).toBe("heritage-bay");
  });

  it("returns null for unknown ids", () => {
    expect(communityIdForServiceBooking("no-such-booking")).toBeNull();
  });
});
