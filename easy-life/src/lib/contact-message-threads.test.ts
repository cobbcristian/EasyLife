import { describe, expect, it } from "vitest";
import {
  buildContactMessageThreads,
  contactMessageThreadKey,
  normalizeReplySubject,
} from "./contact-message-threads";

describe("normalizeReplySubject", () => {
  it("strips nested Re: prefixes", () => {
    expect(normalizeReplySubject("Re: Re: Reschedule cleaning")).toBe("reschedule cleaning");
  });
});

describe("contactMessageThreadKey", () => {
  it("groups replies with the original subject", () => {
    const provider = "cassiesmeticuloustouch@gmail.com";
    const original = {
      senderEmail: "lisa.clarizio@oceanside.com",
      recipient: provider,
      subject: "Reschedule cleaning",
    };
    const reply = {
      senderEmail: provider,
      recipient: "lisa.clarizio@oceanside.com",
      subject: "Re: Reschedule cleaning",
    };
    expect(contactMessageThreadKey(provider, original)).toBe(
      contactMessageThreadKey(provider, reply),
    );
  });
});

describe("buildContactMessageThreads", () => {
  it("orders messages chronologically within a thread", () => {
    const provider = "cassiesmeticuloustouch@gmail.com";
    const threads = buildContactMessageThreads(provider, [
      {
        id: "1",
        communityId: "golden-ocala",
        senderName: "Lisa Clarizio",
        senderEmail: "lisa.clarizio@oceanside.com",
        recipient: provider,
        subject: "Reschedule cleaning",
        message: "Can we move to the afternoon?",
        status: "read",
        createdAt: new Date("2026-06-20T10:00:00Z"),
      },
      {
        id: "2",
        communityId: "golden-ocala",
        senderName: "Cassie",
        senderEmail: provider,
        recipient: "lisa.clarizio@oceanside.com",
        subject: "Re: Reschedule cleaning",
        message: "2 PM works for me.",
        status: "delivered",
        createdAt: new Date("2026-06-20T11:00:00Z"),
      },
    ]);

    expect(threads).toHaveLength(1);
    expect(threads[0]?.messages.map((m) => m.id)).toEqual(["1", "2"]);
    expect(threads[0]?.messages[1]?.isMine).toBe(true);
  });
});
