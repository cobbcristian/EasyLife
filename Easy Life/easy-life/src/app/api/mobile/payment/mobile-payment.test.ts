/**
 * Tests for mobile/payment route — verify service request completion is removed.
 *
 * HIGH 9: The old implementation auto-completed any serviceRequestId when
 * paid: true was sent, without ownership check or actual payment.
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
    email: "member@example.com",
    name: "Test Member",
    communityId: "test-club",
  });
});

describe("POST /api/mobile/payment", () => {
  it("returns ok: true for basic payment without serviceRequestId", async () => {
    const request = makeRequest({ amount: 100 });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.paid).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetMobileSession.mockResolvedValue(null);

    const request = makeRequest({ amount: 100 });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("SECURITY: does NOT complete serviceRequestId anymore", async () => {
    const request = makeRequest({
      serviceRequestId: "sr-victim-123",
      amount: 100,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockServiceRequestUpdate).not.toHaveBeenCalled();
  });

  it("SECURITY: does NOT complete serviceRequestId even with paid: true", async () => {
    const request = makeRequest({
      serviceRequestId: "sr-victim-123",
      amount: 100,
      paid: true,
    });
    const response = await POST(request);

    expect(mockServiceRequestUpdate).not.toHaveBeenCalled();
  });

  it("allows review action", async () => {
    const { upsertProviderReview } = await import("@/lib/server/local-pros");
    const mockUpsertReview = upsertProviderReview as ReturnType<typeof vi.fn>;
    mockUpsertReview.mockResolvedValue({});

    const request = makeRequest({
      action: "review",
      providerId: "provider-123",
      rating: 5,
      review: "Great service!",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.reviewed).toBe(true);
    expect(mockUpsertReview).toHaveBeenCalledWith({
      providerId: "provider-123",
      communityId: "test-club",
      memberEmail: "member@example.com",
      memberName: "Test Member",
      rating: 5,
      comment: "Great service!",
    });
  });

  it("requires providerId and rating for review action", async () => {
    const request = makeRequest({
      action: "review",
      rating: 5,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
