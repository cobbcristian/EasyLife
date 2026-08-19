import { describe, expect, it } from "vitest";
import {
  lessonFeeDollars,
  lessonInitialStatuses,
  lessonOfferingName,
} from "@/lib/server/lessons";
import { canResolveInvoice } from "@/lib/server/invoice-auth";
import type { SessionPayload } from "@/lib/types";

function session(
  partial: Partial<SessionPayload> & Pick<SessionPayload, "role">,
): SessionPayload {
  return {
    sub: "u1",
    email: "a@example.com",
    name: "A",
    communityId: null,
    ...partial,
  };
}

describe("lesson payment gate", () => {
  it("prices lessons server-side", () => {
    expect(
      lessonFeeDollars({ communityId: "oceanside-residents", sport: "tennis" }),
    ).toBe(85);
    expect(
      lessonFeeDollars({
        communityId: "oceanside-residents",
        sport: "golf",
        onCourse: true,
      }),
    ).toBe(120);
    expect(
      lessonFeeDollars({ communityId: "heritage-bay", sport: "golf" }),
    ).toBe(110);
  });

  it("names offerings from sport", () => {
    expect(lessonOfferingName("pickleball")).toBe("Private Pickleball Lesson");
    expect(lessonOfferingName("golf", true)).toBe(
      "Private Golf Lesson (Course)",
    );
  });

  it("starts unpaid lessons as pending (not confirmed)", () => {
    expect(lessonInitialStatuses()).toEqual({
      lesson: "pending_payment",
      amenityHold: "pending",
    });
  });
});

describe("invoice resolve auth", () => {
  it("allows board/admin only for their own community", () => {
    expect(
      canResolveInvoice(session({ role: "board", communityId: "club-a" }), "club-a"),
    ).toBe(true);
    expect(
      canResolveInvoice(session({ role: "board", communityId: "club-a" }), "club-b"),
    ).toBe(false);
    expect(
      canResolveInvoice(session({ role: "member", communityId: "club-a" }), "club-a"),
    ).toBe(false);
  });

  it("allows platform super-admin across clubs", () => {
    expect(
      canResolveInvoice(session({ role: "admin", communityId: null }), "club-b"),
    ).toBe(true);
  });
});
