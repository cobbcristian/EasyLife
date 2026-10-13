/**
 * Security regression tests for role matrix API superadmin restriction.
 *
 * These tests prove that on da0523a:
 * - A club admin (admin role WITH communityId) can access the role matrix
 * - Only superadmin (admin role WITHOUT communityId) should be allowed
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/types";

const SUPERADMIN_SESSION: SessionPayload = {
  sub: "superadmin-id",
  email: "superadmin@gmail.com",
  role: "admin",
  name: "Super Admin",
  communityId: null,
};

const CLUB_ADMIN_SESSION: SessionPayload = {
  sub: "club-admin-id",
  email: "clubadmin@example.com",
  role: "admin",
  name: "Club Admin",
  communityId: "test-community",
};

const MEMBER_SESSION: SessionPayload = {
  sub: "member-id",
  email: "member@example.com",
  role: "member",
  name: "Member",
  communityId: "test-community",
};

vi.mock("@/lib/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/server/records", () => ({
  getRoleMatrix: vi.fn(() => ({
    admin: ["manage_users", "manage_roles"],
    member: ["view_directory"],
  })),
  saveRoleMatrix: vi.fn(),
}));

describe("Roles API superadmin restriction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("PUT /api/roles", () => {
    it("MUST reject club admin (admin with communityId) - require superadmin", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { saveRoleMatrix } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(CLUB_ADMIN_SESSION);

      const { PUT } = await import("@/app/api/roles/route");

      const request = new Request("http://localhost/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix: { admin: ["all_permissions"], member: [] },
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("superadmin");
      expect(saveRoleMatrix).not.toHaveBeenCalled();
    });

    it("should allow superadmin to modify role matrix", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { saveRoleMatrix } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(SUPERADMIN_SESSION);

      const { PUT } = await import("@/app/api/roles/route");

      const request = new Request("http://localhost/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrix: { admin: ["all_permissions"], member: ["view_directory"] },
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(saveRoleMatrix).toHaveBeenCalled();
    });

    it("MUST reject non-admin roles", async () => {
      const { getSession } = await import("@/lib/server/auth");
      const { saveRoleMatrix } = await import("@/lib/server/records");

      vi.mocked(getSession).mockResolvedValue(MEMBER_SESSION);

      const { PUT } = await import("@/app/api/roles/route");

      const request = new Request("http://localhost/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix: {} }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(401);
      expect(saveRoleMatrix).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/roles", () => {
    it("MUST reject club admin from reading role matrix", async () => {
      const { getSession } = await import("@/lib/server/auth");

      vi.mocked(getSession).mockResolvedValue(CLUB_ADMIN_SESSION);

      const { GET } = await import("@/app/api/roles/route");

      const response = await GET();

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.matrix).toBeUndefined();
    });
  });
});
