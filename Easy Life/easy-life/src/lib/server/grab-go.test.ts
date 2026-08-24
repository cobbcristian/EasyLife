import { describe, expect, it } from "vitest";
import {
  createAppUnlockToken,
  grabGoChargeStatusOnClose,
  memberNumberFromEmail,
  parseAppUnlockToken,
} from "@/lib/server/grab-go";

describe("grab-and-go unlock", () => {
  it("derives a stable 6-digit member number", () => {
    const a = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    const b = memberNumberFromEmail("sarah.mitchell@oceanside.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{6}$/);
  });

  it("round-trips a short-lived app unlock token", () => {
    const token = createAppUnlockToken("sarah.mitchell@oceanside.com");
    expect(parseAppUnlockToken(token)?.email).toBe("sarah.mitchell@oceanside.com");
  });

  it("never marks close settlement paid from unlock method (incl. card_tap)", () => {
    expect(grabGoChargeStatusOnClose("card_tap")).toBe("due");
    expect(grabGoChargeStatusOnClose("member_id")).toBe("due");
    expect(grabGoChargeStatusOnClose("app_remote")).toBe("due");
    expect(grabGoChargeStatusOnClose("rfid")).toBe("due");
    expect(grabGoChargeStatusOnClose("app_qr")).toBe("due");
  });
});
