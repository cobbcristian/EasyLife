import { describe, expect, it } from "vitest";
import { canMutateCommunityResource } from "./community-resource-scope";
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

describe("canMutateCommunityResource", () => {
  it("allows super admin for any community", () => {
    const s = session({ role: "admin", communityId: null });
    expect(canMutateCommunityResource(s, "club-b")).toBe(true);
  });

  it("allows club staff only for their own community", () => {
    const s = session({ role: "pm", communityId: "club-a" });
    expect(canMutateCommunityResource(s, "club-a")).toBe(true);
    expect(canMutateCommunityResource(s, "club-b")).toBe(false);
  });

  it("denies when resource has no community and session is not super admin", () => {
    const s = session({ role: "admin", communityId: "club-a" });
    expect(canMutateCommunityResource(s, null)).toBe(false);
  });
});
