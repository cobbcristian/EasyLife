import { describe, expect, it } from "vitest";
import {
  amountForProviderServices,
  providerOwnsBooking,
} from "./provider-booking-auth";
import type { ServiceBooking } from "@/lib/types";

const booking = (provider: string): ServiceBooking => ({
  id: "sb1",
  resident: "Mike Smith",
  provider,
  service: "Full House Cleaning",
  date: "2026-07-08",
  time: "10:00 AM",
  status: "accepted",
  amount: 250,
});

describe("providerOwnsBooking", () => {
  it("allows the assigned provider", () => {
    expect(
      providerOwnsBooking(booking("Cassie's Meticulous Touch"), "Cassie's Meticulous Touch"),
    ).toBe(true);
  });

  it("rejects another provider mutating the booking", () => {
    expect(
      providerOwnsBooking(booking("Cassie's Meticulous Touch"), "Premier Carpet Care"),
    ).toBe(false);
  });

  it("rejects missing bookings", () => {
    expect(providerOwnsBooking(null, "Anyone")).toBe(false);
    expect(providerOwnsBooking(undefined, "Anyone")).toBe(false);
  });
});

describe("amountForProviderServices", () => {
  it("computes amounts server-side", () => {
    expect(amountForProviderServices(["Full House Cleaning"])).toBe(250);
    expect(amountForProviderServices(["Carpet Cleaning"])).toBe(150);
    expect(amountForProviderServices(["Court booking"])).toBe(0);
    expect(amountForProviderServices(["Window Wash"])).toBe(100);
  });
});
