import { describe, expect, it } from "vitest";
import {
  canAccessTramRequest,
  canMutateTramRequest,
  isTramStaff,
} from "@/lib/server/tram-auth";
import type { SessionPayload } from "@/lib/types";

function session(
  partial: Partial<SessionPayload> & Pick<SessionPayload, "role" | "email">,
): SessionPayload {
  return {
    sub: "u1",
    name: "Test",
    communityId: null,
    ...partial,
  };
}

const ride = {
  communityId: "oceanside-residents",
  memberEmail: "alice@oceanside.com",
};

describe("tram auth", () => {
  it("treats pm and club admin as tram staff", () => {
    expect(isTramStaff(session({ role: "pm", email: "pm@x.com" }))).toBe(true);
    expect(
      isTramStaff(
        session({
          role: "admin",
          email: "a@x.com",
          communityId: "oceanside-residents",
        }),
      ),
    ).toBe(true);
    expect(isTramStaff(session({ role: "member", email: "m@x.com" }))).toBe(
      false,
    );
  });

  it("blocks club staff from another club's tram request", () => {
    const foreignPm = session({
      role: "pm",
      email: "pm@ironlake.com",
      communityId: "iron-lake",
    });
    expect(canAccessTramRequest(foreignPm, ride)).toBe(false);
    expect(canMutateTramRequest(foreignPm, ride, "dispatched").ok).toBe(false);
  });

  it("allows same-club pm to update and member to cancel own ride", () => {
    const pm = session({
      role: "pm",
      email: "pm@oceanside.com",
      communityId: "oceanside-residents",
    });
    expect(canAccessTramRequest(pm, ride)).toBe(true);
    expect(canMutateTramRequest(pm, ride, "dispatched")).toEqual({ ok: true });

    const owner = session({ role: "member", email: "alice@oceanside.com" });
    expect(canMutateTramRequest(owner, ride, "cancelled")).toEqual({
      ok: true,
    });
    expect(canMutateTramRequest(owner, ride, "dispatched").ok).toBe(false);
  });

  it("allows platform super-admin across clubs", () => {
    const superAdmin = session({ role: "admin", email: "root@x.com" });
    expect(canAccessTramRequest(superAdmin, ride)).toBe(true);
  });
});
