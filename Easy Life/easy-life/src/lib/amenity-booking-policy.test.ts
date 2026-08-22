import { describe, expect, it } from "vitest";
import {
  amenityRequiresManagementApproval,
  initialBookingStatus,
  unknownAmenityIdMustReject,
} from "@/lib/amenity-booking-policy";

describe("amenity-booking-policy", () => {
  it("auto-confirms billiards, courts, and grills", () => {
    expect(initialBookingStatus("Billiard Table")).toBe("confirmed");
    expect(initialBookingStatus("Tennis Court #1")).toBe("confirmed");
    expect(initialBookingStatus("Grill #1 (Left Side)")).toBe("confirmed");
    expect(amenityRequiresManagementApproval("Billiard Table")).toBe(false);
  });

  it("requires management approval for social / board rooms", () => {
    expect(initialBookingStatus("Board Room")).toBe("pending");
    expect(initialBookingStatus("Social Room")).toBe("pending");
    expect(amenityRequiresManagementApproval("The Social Room")).toBe(true);
  });

  it("rejects forged amenityId that does not resolve in-club", () => {
    expect(unknownAmenityIdMustReject("am_fake", false)).toBe(true);
    expect(unknownAmenityIdMustReject("am_real", true)).toBe(false);
    expect(unknownAmenityIdMustReject(undefined, false)).toBe(false);
    expect(unknownAmenityIdMustReject("", false)).toBe(false);
  });
});
