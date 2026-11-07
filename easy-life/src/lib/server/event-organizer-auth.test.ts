import { describe, expect, it } from "vitest";
import {
  organizerEmailAllowsManage,
  pickLegacyOrganizerEmail,
} from "@/lib/server/event-organizer-auth";

describe("pickLegacyOrganizerEmail", () => {
  it("picks the earliest RSVP matching the host display name", () => {
    const email = pickLegacyOrganizerEmail("Sarah Mitchell", [
      {
        memberEmail: "sarah@club.com",
        memberName: "Sarah Mitchell",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        memberEmail: "attacker@evil.com",
        memberName: "Sarah Mitchell",
        createdAt: new Date("2026-01-02T10:00:00Z"),
      },
    ]);
    expect(email).toBe("sarah@club.com");
  });

  it("is case-insensitive on display names", () => {
    const email = pickLegacyOrganizerEmail("sarah mitchell", [
      {
        memberEmail: "sarah@club.com",
        memberName: "Sarah Mitchell",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
    ]);
    expect(email).toBe("sarah@club.com");
  });

  it("returns null when no RSVP matches the host name", () => {
    expect(
      pickLegacyOrganizerEmail("Social Committee", [
        {
          memberEmail: "member@club.com",
          memberName: "Sarah Mitchell",
          createdAt: new Date("2026-01-01T10:00:00Z"),
        },
      ]),
    ).toBeNull();
  });
});

describe("organizerEmailAllowsManage", () => {
  it("allows the stored organizer email in the same club", () => {
    expect(
      organizerEmailAllowsManage({
        organizerEmail: "sarah@club.com",
        memberEmail: "Sarah@Club.com",
        eventCommunityId: "club-a",
        communityId: "club-a",
      }),
    ).toBe(true);
  });

  it("rejects same-name attackers with a different email", () => {
    expect(
      organizerEmailAllowsManage({
        organizerEmail: "sarah@club.com",
        memberEmail: "attacker@evil.com",
        eventCommunityId: "club-a",
        communityId: "club-a",
      }),
    ).toBe(false);
  });

  it("rejects cross-tenant organizers", () => {
    expect(
      organizerEmailAllowsManage({
        organizerEmail: "sarah@club.com",
        memberEmail: "sarah@club.com",
        eventCommunityId: "club-a",
        communityId: "club-b",
      }),
    ).toBe(false);
  });
});
