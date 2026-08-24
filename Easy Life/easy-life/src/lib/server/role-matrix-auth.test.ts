import { describe, expect, it } from "vitest";
import { isSuperAdmin } from "@/lib/server/community-context";
import type { SessionPayload } from "@/lib/types";

function session(
  partial: Partial<SessionPayload> & Pick<SessionPayload, "role">,
): SessionPayload {
  return {
    sub: "u1",
    email: "a@x.com",
    name: "Admin",
    communityId: null,
    ...partial,
  };
}

describe("role matrix write gate", () => {
  it("allows only platform super-admin (admin with no communityId)", () => {
    expect(isSuperAdmin(session({ role: "admin" }))).toBe(true);
    expect(
      isSuperAdmin(
        session({ role: "admin", communityId: "oceanside-residents" }),
      ),
    ).toBe(false);
    expect(isSuperAdmin(session({ role: "pm", communityId: "x" }))).toBe(false);
  });
});
