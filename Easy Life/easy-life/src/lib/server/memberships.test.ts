import { describe, expect, it } from "vitest";
import {
  roleForAdditionalCommunityJoin,
  sessionRoleAfterCommunitySwitch,
} from "@/lib/server/memberships";

describe("multi-club membership roles", () => {
  it("defaults invite join to member instead of copying a global admin role", () => {
    expect(roleForAdditionalCommunityJoin(undefined)).toBe("member");
    expect(roleForAdditionalCommunityJoin("admin")).toBe("admin");
    expect(roleForAdditionalCommunityJoin("board")).toBe("board");
  });

  it("uses the target membership role when switching clubs", () => {
    expect(sessionRoleAfterCommunitySwitch("member")).toBe("member");
    expect(sessionRoleAfterCommunitySwitch("admin")).toBe("admin");
    expect(sessionRoleAfterCommunitySwitch("pm")).toBe("pm");
  });
});
