import { describe, expect, it } from "vitest";
import {
  isRoleBlockedDuringStaging,
  shouldBlockSessionForStaging,
} from "@/lib/server/staging-policy";

describe("staging policy", () => {
  it("blocks member, board, pm, and provider during staging", () => {
    expect(isRoleBlockedDuringStaging("member")).toBe(true);
    expect(isRoleBlockedDuringStaging("board")).toBe(true);
    expect(isRoleBlockedDuringStaging("pm")).toBe(true);
    expect(isRoleBlockedDuringStaging("provider")).toBe(true);
  });

  it("never blocks super admin", () => {
    expect(isRoleBlockedDuringStaging("admin")).toBe(false);
  });

  it("blocks non-admin when community is in staging", () => {
    expect(shouldBlockSessionForStaging("member", "c1", true)).toBe(true);
    expect(shouldBlockSessionForStaging("admin", "c1", true)).toBe(false);
  });

  it("does not block when staging is off or community missing", () => {
    expect(shouldBlockSessionForStaging("member", "c1", false)).toBe(false);
    expect(shouldBlockSessionForStaging("member", null, true)).toBe(false);
  });
});
