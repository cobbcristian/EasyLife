import { describe, expect, it } from "vitest";
import { canManageCommunityEvent } from "./event-organizer-auth";

const event = {
  createdBy: "John Smith",
  createdByEmail: "john.a@club.com",
  communityId: "oceanside-residents",
};

describe("canManageCommunityEvent", () => {
  it("allows the organizer by email even when another member shares the display name", () => {
    expect(
      canManageCommunityEvent(event, {
        email: "john.a@club.com",
        name: "John Smith",
        role: "member",
        communityId: "oceanside-residents",
      }),
    ).toBe(true);

    expect(
      canManageCommunityEvent(event, {
        email: "john.b@club.com",
        name: "John Smith",
        role: "member",
        communityId: "oceanside-residents",
      }),
    ).toBe(false);
  });

  it("allows same-club staff", () => {
    expect(
      canManageCommunityEvent(event, {
        email: "pm@oceanside.example",
        name: "Pat Manager",
        role: "pm",
        communityId: "oceanside-residents",
      }),
    ).toBe(true);
  });

  it("rejects staff from another club", () => {
    expect(
      canManageCommunityEvent(event, {
        email: "admin@ironlake.example",
        name: "Other Admin",
        role: "admin",
        communityId: "iron-lake",
      }),
    ).toBe(false);
  });

  it("uses legacy organizer RSVP email when createdByEmail is missing", () => {
    expect(
      canManageCommunityEvent(
        {
          createdBy: "John Smith",
          createdByEmail: null,
          communityId: "oceanside-residents",
          legacyOrganizerEmail: "john.a@club.com",
        },
        {
          email: "john.a@club.com",
          name: "John Smith",
          role: "member",
          communityId: "oceanside-residents",
        },
      ),
    ).toBe(true);

    expect(
      canManageCommunityEvent(
        {
          createdBy: "John Smith",
          createdByEmail: null,
          communityId: "oceanside-residents",
          legacyOrganizerEmail: "john.a@club.com",
        },
        {
          email: "john.b@club.com",
          name: "John Smith",
          role: "member",
          communityId: "oceanside-residents",
        },
      ),
    ).toBe(false);
  });

  it("denies name-only match when no organizer email is known", () => {
    expect(
      canManageCommunityEvent(
        {
          createdBy: "John Smith",
          createdByEmail: null,
          communityId: "oceanside-residents",
        },
        {
          email: "john.b@club.com",
          name: "John Smith",
          role: "member",
          communityId: "oceanside-residents",
        },
      ),
    ).toBe(false);
  });
});
