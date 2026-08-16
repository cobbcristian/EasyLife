import { describe, expect, it } from "vitest";
import { resolveCheckoutSettlementKind } from "./checkout-settlement";

describe("resolveCheckoutSettlementKind", () => {
  it("routes HOA metadata to hoa settlement", () => {
    expect(
      resolveCheckoutSettlementKind({
        metadataType: "hoa",
        metadataKind: "clinic_guest_fee",
        referenceType: "clinic_guest_fee",
      }),
    ).toBe("hoa");
  });

  it("routes clinic guest metadata to clinic RSVP settlement", () => {
    expect(
      resolveCheckoutSettlementKind({
        metadataKind: "clinic_guest_fee",
      }),
    ).toBe("clinic_guest");
  });

  it("routes clinic guest referenceType when metadata kind is missing", () => {
    expect(
      resolveCheckoutSettlementKind({
        referenceType: "clinic_guest_fee",
      }),
    ).toBe("clinic_guest");
  });

  it("routes ordinary charges to standard settlement", () => {
    expect(
      resolveCheckoutSettlementKind({
        metadataKind: "court_guest_fee",
        referenceType: "court_guest_fee",
      }),
    ).toBe("standard");
    expect(resolveCheckoutSettlementKind({})).toBe("standard");
  });
});
