import { describe, expect, it } from "vitest";
import {
  amenityRequiresManagementApproval,
  bookingStatusAfterAmenityFeePaid,
  initialBookingStatus,
} from "@/lib/amenity-booking-policy";

describe("amenity-booking-policy", () => {
  it("auto-confirms free billiards, courts, and grills", () => {
    expect(initialBookingStatus("Billiard Table")).toBe("confirmed");
    expect(initialBookingStatus("Tennis Court #1", 0)).toBe("confirmed");
    expect(initialBookingStatus("Grill #1 (Left Side)")).toBe("confirmed");
    expect(amenityRequiresManagementApproval("Billiard Table")).toBe(false);
  });

  it("keeps paid amenities pending until fee is settled", () => {
    expect(initialBookingStatus("Tennis Court #1", 95)).toBe("pending");
    expect(initialBookingStatus("Boat Slip", 150)).toBe("pending");
    expect(bookingStatusAfterAmenityFeePaid("Tennis Court #1")).toBe(
      "confirmed",
    );
  });

  it("requires management approval for social / board rooms", () => {
    expect(initialBookingStatus("Board Room")).toBe("pending");
    expect(initialBookingStatus("Social Room", 0)).toBe("pending");
    expect(initialBookingStatus("Social Room", 200)).toBe("pending");
    expect(amenityRequiresManagementApproval("The Social Room")).toBe(true);
    expect(bookingStatusAfterAmenityFeePaid("Board Room")).toBe("pending");
  });
});
