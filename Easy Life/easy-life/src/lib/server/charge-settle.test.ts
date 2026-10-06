import { describe, expect, it } from "vitest";
import { parseChargeIdsMetadata } from "./charge-settle";

describe("parseChargeIdsMetadata", () => {
  it("returns empty for missing or blank", () => {
    expect(parseChargeIdsMetadata(undefined)).toEqual([]);
    expect(parseChargeIdsMetadata("")).toEqual([]);
    expect(parseChargeIdsMetadata("   ")).toEqual([]);
  });

  it("splits and trims comma-separated ids", () => {
    expect(parseChargeIdsMetadata("a, b,,c ")).toEqual(["a", "b", "c"]);
  });
});
