import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/prisma", () => ({ prisma: {} }));

import {
  AI_CHAT_DELETED_ACCOUNT_DAYS,
  AI_CHAT_MAX_AGE_DAYS,
  aiChatMaxAgeCutoff,
  findOrphanEmails,
} from "@/lib/server/ai-chat-retention";

describe("Barnaby chat retention", () => {
  it("matches the privacy policy promises", () => {
    expect(AI_CHAT_DELETED_ACCOUNT_DAYS).toBe(30);
    expect(AI_CHAT_MAX_AGE_DAYS).toBe(365);
  });

  it("cuts off chats older than 12 months", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    expect(aiChatMaxAgeCutoff(now).toISOString()).toBe("2025-10-11T12:00:00.000Z");
  });

  it("finds chats whose account is gone, ignoring email case", () => {
    expect(
      findOrphanEmails(["A@x.com", "gone@x.com", "b@x.com"], ["a@x.com", "B@X.com"]),
    ).toEqual(["gone@x.com"]);
  });
});
