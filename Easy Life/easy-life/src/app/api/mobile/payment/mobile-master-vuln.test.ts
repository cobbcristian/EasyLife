/**
 * Tests that demonstrate HIGH 9 vulnerability on master (da0523a).
 *
 * These tests are designed to FAIL on master and PASS on the fixed branch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/mobile-auth", () => ({
  getMobileSession: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    serviceRequest: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server/local-pros", () => ({
  upsertProviderReview: vi.fn(),
}));

import { getMobileSession } from "@/lib/server/mobile-auth";
import { prisma } from "@/lib/server/prisma";
import { POST } from "./route";

const mockGetMobileSession = getMobileSession as ReturnType<typeof vi.fn>;
const mockServiceRequestUpdate = prisma.serviceRequest.update as ReturnType<typeof vi.fn>;

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/mobile/payment", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetMobileSession.mockResolvedValue({
    email: "attacker@example.com",
    name: "Attacker",
    communityId: "test-club",
  });

  mockServiceRequestUpdate.mockResolvedValue({ id: "sr-victim", status: "completed" });
});

describe("HIGH 9: Mobile payment vulnerabilities (master)", () => {
  it("VULNERABILITY: marks any serviceRequestId as completed without ownership check", async () => {
    const request = makeRequest({
      serviceRequestId: "sr-victim-request",
      amount: 0,
    });
    const response = await POST(request);
    const json = await response.json();

    // MASTER BUG: Updates ANY service request without checking ownership
    // FIXED: Should NOT call prisma.serviceRequest.update at all
    expect(mockServiceRequestUpdate).not.toHaveBeenCalled();
  });

  it("VULNERABILITY: returns paid:true without actual payment for service request", async () => {
    const request = makeRequest({
      serviceRequestId: "sr-someone-elses",
      amount: 500,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.paid).toBe(true);

    // MASTER BUG: Marks service request completed AND returns paid:true
    // FIXED: Should NOT modify service request
    expect(mockServiceRequestUpdate).not.toHaveBeenCalled();
  });
});
