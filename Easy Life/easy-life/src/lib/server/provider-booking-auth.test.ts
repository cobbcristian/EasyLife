import { describe, expect, it } from "vitest";
import {
  getCommunityBookingById,
  updateCommunityBookingStatus,
  updateCommunityBookingStatusForProvider,
} from "@/lib/communities-data";
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
      providerOwnsBooking(
        booking("Cassie's Meticulous Touch"),
        "Cassie's Meticulous Touch",
      ),
    ).toBe(true);
  });

  it("rejects another provider mutating the booking", () => {
    expect(
      providerOwnsBooking(
        booking("Cassie's Meticulous Touch"),
        "Premier Carpet Care",
      ),
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

describe("updateCommunityBookingStatusForProvider", () => {
  it("does not mutate status when the caller is not the assigned provider", () => {
    const before = getCommunityBookingById("sb1");
    expect(before).toBeTruthy();
    const priorStatus = before!.status;

    const denied = updateCommunityBookingStatusForProvider(
      "sb1",
      "cancelled",
      "Premier Carpet Care",
    );
    expect(denied).toBeNull();
    expect(getCommunityBookingById("sb1")?.status).toBe(priorStatus);
  });

  it("documents that update-then-check still persists rival cancels", () => {
    const before = getCommunityBookingById("sb2");
    expect(before).toBeTruthy();
    const owner = before!.provider;
    expect(owner).not.toBe("Premier Carpet Care");

    // Buggy pattern previously used by provider PATCH handlers.
    const mutated = updateCommunityBookingStatus("sb2", "cancelled");
    expect(providerOwnsBooking(mutated, "Premier Carpet Care")).toBe(false);
    expect(getCommunityBookingById("sb2")?.status).toBe("cancelled");

    // Restore so other tests see a stable seed row.
    updateCommunityBookingStatus("sb2", before!.status);
    expect(getCommunityBookingById("sb2")?.status).toBe(before!.status);
  });

  it("updates when the assigned provider matches", () => {
    const before = getCommunityBookingById("sb3");
    expect(before).toBeTruthy();
    const owner = before!.provider;
    const prior = before!.status;

    const updated = updateCommunityBookingStatusForProvider(
      "sb3",
      "completed",
      owner,
    );
    expect(updated?.status).toBe("completed");
    expect(getCommunityBookingById("sb3")?.status).toBe("completed");

    updateCommunityBookingStatusForProvider("sb3", prior, owner);
    expect(getCommunityBookingById("sb3")?.status).toBe(prior);
  });
});
