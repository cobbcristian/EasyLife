import { describe, expect, it } from "vitest";
import {
  authorizeGrabGoMachine,
  createAppUnlockToken,
  isLegacyEmailDerivedMemberNumber,
  isLegacyEmailDerivedRfidUid,
  memberNumberFromEmail,
  parseAppUnlockToken,
  rfidUidFromEmail,
} from "@/lib/server/grab-go";

describe("grab-and-go unlock", () => {
  it("legacy email-derived member numbers are stable (for detection only)", () => {
    const a = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    const b = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{6}$/);
    expect(isLegacyEmailDerivedMemberNumber("sarah.mitchell@oceanside.com", a)).toBe(
      true,
    );
    expect(isLegacyEmailDerivedMemberNumber("sarah.mitchell@oceanside.com", "123456")).toBe(
      false,
    );
  });

  it("legacy RFID UIDs are detectable so forged tags can be rejected", () => {
    const uid = rfidUidFromEmail("sarah.mitchell@oceanside.com");
    expect(uid).toMatch(/^CL-[0-9A-F]{8}$/);
    expect(isLegacyEmailDerivedRfidUid("sarah.mitchell@oceanside.com", uid)).toBe(true);
    expect(isLegacyEmailDerivedRfidUid("sarah.mitchell@oceanside.com", "CL-DEADBEEF")).toBe(
      false,
    );
  });

  it("round-trips a short-lived app unlock token", () => {
    const token = createAppUnlockToken("sarah.mitchell@oceanside.com");
    expect(parseAppUnlockToken(token)?.email).toBe("sarah.mitchell@oceanside.com");
  });

  it("requires GRAB_GO_MACHINE_KEY in production", () => {
    const req = { headers: { get: () => null } };
    const denied = authorizeGrabGoMachine(req, {
      machineKey: undefined,
      nodeEnv: "production",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.status).toBe(503);
    }

    const demo = authorizeGrabGoMachine(req, {
      machineKey: undefined,
      nodeEnv: "development",
    });
    expect(demo.ok).toBe(true);

    const keyed = authorizeGrabGoMachine(
      { headers: { get: (n) => (n === "x-grab-go-key" ? "secret" : null) } },
      { machineKey: "secret", nodeEnv: "production" },
    );
    expect(keyed.ok).toBe(true);

    const wrong = authorizeGrabGoMachine(
      { headers: { get: (n) => (n === "x-grab-go-key" ? "nope" : null) } },
      { machineKey: "secret", nodeEnv: "production" },
    );
    expect(wrong.ok).toBe(false);
  });
});
