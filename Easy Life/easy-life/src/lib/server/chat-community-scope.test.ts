import { describe, expect, it } from "vitest";
import {
  ChatCommunityScopeError,
  CROSS_CLUB_MESSAGE,
} from "@/lib/server/chat-community-scope";

describe("ChatCommunityScopeError", () => {
  it("uses the shared cross-club message and 403 status", () => {
    const err = new ChatCommunityScopeError();
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(CROSS_CLUB_MESSAGE);
    expect(err.status).toBe(403);
    expect(err.name).toBe("ChatCommunityScopeError");
  });

  it("allows a custom message", () => {
    const err = new ChatCommunityScopeError("Nope");
    expect(err.message).toBe("Nope");
    expect(err.status).toBe(403);
  });
});
