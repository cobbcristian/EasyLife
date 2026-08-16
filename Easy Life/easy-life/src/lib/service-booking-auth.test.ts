import { describe, expect, it } from "vitest";
import { canMemberActOnServiceBooking } from "@/lib/service-booking-auth";

describe("canMemberActOnServiceBooking", () => {
  it("allows the named resident", () => {
    expect(
      canMemberActOnServiceBooking({
        sessionName: "Mike Smith",
        bookingResident: "Mike Smith",
      }),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(
      canMemberActOnServiceBooking({
        sessionName: "mike smith",
        bookingResident: "Mike Smith",
      }),
    ).toBe(true);
  });

  it("rejects another member (IDOR)", () => {
    expect(
      canMemberActOnServiceBooking({
        sessionName: "Tom Jones",
        bookingResident: "Mike Smith",
      }),
    ).toBe(false);
  });

  it("rejects empty names", () => {
    expect(
      canMemberActOnServiceBooking({
        sessionName: "  ",
        bookingResident: "Mike Smith",
      }),
    ).toBe(false);
  });
});
