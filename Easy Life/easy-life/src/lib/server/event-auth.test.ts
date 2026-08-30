import { describe, expect, it } from "vitest";
import {
  canManageCommunityEvent,
  eventBelongsToSessionCommunity,
  isClubStaffRole,
  isEventOrganizer,
  namesMatch,
  normalizeEmail,
  resolveOrganizerEmail,
} from "./event-auth";

describe("eventBelongsToSessionCommunity", () => {
  it("requires matching non-null community ids", () => {
    expect(eventBelongsToSessionCommunity("club-a", "club-a")).toBe(true);
    expect(eventBelongsToSessionCommunity("club-a", "club-b")).toBe(false);
    expect(eventBelongsToSessionCommunity("club-a", null)).toBe(false);
    expect(eventBelongsToSessionCommunity("club-a", undefined)).toBe(false);
  });
});

describe("resolveOrganizerEmail", () => {
  it("finds host RSVP by display name", () => {
    expect(
      resolveOrganizerEmail(
        [
          { memberEmail: "guest@x.test", memberName: "Other" },
          { memberEmail: "Jordan@Club.Test", memberName: "Jordan Blake" },
        ],
        "jordan blake",
      ),
    ).toBe("jordan@club.test");
  });

  it("returns null when no matching RSVP", () => {
    expect(
      resolveOrganizerEmail(
        [{ memberEmail: "a@x.test", memberName: "Someone" }],
        "Jordan Blake",
      ),
    ).toBeNull();
  });
});

describe("canManageCommunityEvent", () => {
  const eventCreatedBy = "Jordan Blake";

  it("allows staff in any case", () => {
    expect(
      canManageCommunityEvent({
        eventCreatedBy,
        organizerEmail: "host@club.test",
        actor: {
          email: "pm@club.test",
          name: "Other",
          role: "pm",
        },
      }),
    ).toBe(true);
    expect(isClubStaffRole("board")).toBe(true);
    expect(isClubStaffRole("member")).toBe(false);
  });

  it("allows organizer by email even when display names differ", () => {
    expect(
      canManageCommunityEvent({
        eventCreatedBy,
        organizerEmail: "jordan@club.test",
        actor: {
          email: "Jordan@Club.Test",
          name: "J. Blake",
          role: "member",
        },
      }),
    ).toBe(true);
  });

  it("rejects same display name when organizer email belongs to someone else", () => {
    expect(
      canManageCommunityEvent({
        eventCreatedBy,
        organizerEmail: "real-host@club.test",
        actor: {
          email: "imposter@club.test",
          name: "Jordan Blake",
          role: "member",
        },
      }),
    ).toBe(false);
  });

  it("falls back to name match only when organizer email is missing", () => {
    expect(
      canManageCommunityEvent({
        eventCreatedBy,
        organizerEmail: null,
        actor: {
          email: "anyone@club.test",
          name: "Jordan Blake",
          role: "member",
        },
      }),
    ).toBe(true);
    expect(
      canManageCommunityEvent({
        eventCreatedBy,
        organizerEmail: null,
        actor: {
          email: "anyone@club.test",
          name: "Other Person",
          role: "member",
        },
      }),
    ).toBe(false);
  });
});

describe("isEventOrganizer", () => {
  it("matches email or legacy name", () => {
    expect(
      isEventOrganizer({
        eventCreatedBy: "Host",
        actorEmail: "h@x.test",
        actorName: "Other",
        organizerEmail: "h@x.test",
      }),
    ).toBe(true);
    expect(
      isEventOrganizer({
        eventCreatedBy: "Host",
        actorEmail: "x@x.test",
        actorName: "Host",
        organizerEmail: null,
      }),
    ).toBe(true);
    expect(
      isEventOrganizer({
        eventCreatedBy: "Host",
        actorEmail: "x@x.test",
        actorName: "Host",
        organizerEmail: "real@x.test",
      }),
    ).toBe(false);
  });
});

describe("normalize helpers", () => {
  it("normalizes email and names", () => {
    expect(normalizeEmail("  A@B.C  ")).toBe("a@b.c");
    expect(namesMatch(" Jordan ", "jordan")).toBe(true);
  });
});
