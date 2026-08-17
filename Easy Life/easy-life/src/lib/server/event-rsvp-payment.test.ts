import { describe, expect, it } from "vitest";
import {
  EVENT_FEE_REFERENCE,
  isVerifiedPaidEventFee,
} from "@/lib/server/event-rsvp-payment";

describe("isVerifiedPaidEventFee", () => {
  const base = {
    status: "paid",
    referenceType: EVENT_FEE_REFERENCE,
    referenceId: "evt_1",
    memberEmail: "member@club.com",
    amount: 25,
  };

  it("accepts a matching paid event_fee charge", () => {
    expect(
      isVerifiedPaidEventFee(base, {
        eventId: "evt_1",
        memberEmail: "Member@Club.com",
        minAmountDollars: 25,
      }),
    ).toBe(true);
  });

  it("rejects client-style unpaid / wrong-status charges", () => {
    expect(
      isVerifiedPaidEventFee(
        { ...base, status: "due" },
        { eventId: "evt_1", memberEmail: "member@club.com", minAmountDollars: 25 },
      ),
    ).toBe(false);
  });

  it("rejects charges for a different event or member", () => {
    expect(
      isVerifiedPaidEventFee(base, {
        eventId: "evt_other",
        memberEmail: "member@club.com",
        minAmountDollars: 25,
      }),
    ).toBe(false);
    expect(
      isVerifiedPaidEventFee(base, {
        eventId: "evt_1",
        memberEmail: "attacker@club.com",
        minAmountDollars: 25,
      }),
    ).toBe(false);
  });

  it("rejects underpayment relative to the required fee", () => {
    expect(
      isVerifiedPaidEventFee(
        { ...base, amount: 1 },
        { eventId: "evt_1", memberEmail: "member@club.com", minAmountDollars: 25 },
      ),
    ).toBe(false);
  });

  it("rejects non-event_fee reference types (cannot spoof with unrelated paid charge)", () => {
    expect(
      isVerifiedPaidEventFee(
        { ...base, referenceType: "hoa_assessment" },
        { eventId: "evt_1", memberEmail: "member@club.com", minAmountDollars: 25 },
      ),
    ).toBe(false);
  });
});
