import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createDriverSessionToken,
  clearPinRateLimit,
  hashDriverPin,
} from "@/lib/server/driver-auth";

// Mock Prisma
vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    tramDriver: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tramRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock SMS
vi.mock("@/lib/server/sms", () => ({
  sendSms: vi.fn(),
  isSmsConfigured: () => false,
}));

import { prisma } from "@/lib/server/prisma";
import { GET as getAssignments } from "@/app/api/driver/[id]/assignments/route";
import { PATCH as patchRequest } from "@/app/api/driver/[id]/assignments/[requestId]/route";
import { POST as postAuth } from "@/app/api/driver/[id]/auth/route";

const mockPrisma = prisma as unknown as {
  tramDriver: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  tramRequest: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: object;
    bearerToken?: string;
  } = {}
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.bearerToken) {
    headers["Authorization"] = `Bearer ${options.bearerToken}`;
  }
  return new Request(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("GET /api/driver/[id]/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session provided", async () => {
    const req = makeRequest("http://localhost/api/driver/driver-1/assignments");
    const params = Promise.resolve({ id: "driver-1" });
    
    const res = await getAssignments(req as any, { params });
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when member token used on driver route", async () => {
    const { createSessionToken } = await import("@/lib/server/auth");
    
    const memberToken = await createSessionToken({
      sub: "user-123",
      email: "member@example.com",
      role: "member",
      name: "Jane Member",
      communityId: "golden-ocala",
    });

    const req = makeRequest("http://localhost/api/driver/driver-1/assignments", {
      bearerToken: memberToken,
    });
    const params = Promise.resolve({ id: "driver-1" });
    
    const res = await getAssignments(req as any, { params });
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when driver A tries to access driver B's data", async () => {
    // Create token for driver A
    const tokenA = await createDriverSessionToken({
      sub: "driver-A",
      communityId: "golden-ocala",
      name: "Driver A",
    });

    // Try to access driver B's assignments
    const req = makeRequest("http://localhost/api/driver/driver-B/assignments", {
      bearerToken: tokenA,
    });
    const params = Promise.resolve({ id: "driver-B" });
    
    const res = await getAssignments(req as any, { params });
    expect(res.status).toBe(403);
    
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when session communityId doesn't match driver's community", async () => {
    const token = await createDriverSessionToken({
      sub: "driver-1",
      communityId: "community-A",
      name: "Driver",
    });

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: "driver-1",
      name: "Driver",
      status: "on_duty",
      vehicleId: null,
      communityId: "community-B", // Different community
      active: true,
    });

    const req = makeRequest("http://localhost/api/driver/driver-1/assignments", {
      bearerToken: token,
    });
    const params = Promise.resolve({ id: "driver-1" });
    
    const res = await getAssignments(req as any, { params });
    expect(res.status).toBe(403);
  });

  it("returns 200 with assignments for valid session", async () => {
    const token = await createDriverSessionToken({
      sub: "driver-1",
      communityId: "golden-ocala",
      name: "John Driver",
    });

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: "driver-1",
      name: "John Driver",
      status: "on_duty",
      vehicleId: "vehicle-1",
      communityId: "golden-ocala",
      active: true,
    });

    mockPrisma.tramRequest.findMany.mockResolvedValue([
      {
        id: "req-1",
        memberName: "Alice",
        pickupLocation: "Lobby",
        destination: "Clubhouse",
        status: "dispatched",
      },
    ]);

    const req = makeRequest("http://localhost/api/driver/driver-1/assignments", {
      bearerToken: token,
    });
    const params = Promise.resolve({ id: "driver-1" });
    
    const res = await getAssignments(req as any, { params });
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.driver.id).toBe("driver-1");
    expect(body.assignments).toHaveLength(1);
  });
});

describe("PATCH /api/driver/[id]/assignments/[requestId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session provided", async () => {
    const req = makeRequest(
      "http://localhost/api/driver/driver-1/assignments/req-1",
      { method: "PATCH", body: { status: "en_route" } }
    );
    const params = Promise.resolve({ id: "driver-1", requestId: "req-1" });
    
    const res = await patchRequest(req as any, { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when driver A tries to update driver B's request", async () => {
    const tokenA = await createDriverSessionToken({
      sub: "driver-A",
      communityId: "golden-ocala",
      name: "Driver A",
    });

    const req = makeRequest(
      "http://localhost/api/driver/driver-B/assignments/req-1",
      { method: "PATCH", body: { status: "en_route" }, bearerToken: tokenA }
    );
    const params = Promise.resolve({ id: "driver-B", requestId: "req-1" });
    
    const res = await patchRequest(req as any, { params });
    expect(res.status).toBe(403);
  });

  it("returns 403 for cross-community request", async () => {
    const token = await createDriverSessionToken({
      sub: "driver-1",
      communityId: "community-A",
      name: "Driver",
    });

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      name: "Driver",
      communityId: "community-A",
      active: true,
    });

    mockPrisma.tramRequest.findUnique.mockResolvedValue({
      id: "req-1",
      communityId: "community-B", // Different community
      driverName: "Driver",
      status: "dispatched",
    });

    const req = makeRequest(
      "http://localhost/api/driver/driver-1/assignments/req-1",
      { method: "PATCH", body: { status: "en_route" }, bearerToken: token }
    );
    const params = Promise.resolve({ id: "driver-1", requestId: "req-1" });
    
    const res = await patchRequest(req as any, { params });
    expect(res.status).toBe(403);
  });

  it("returns 403 when request is not assigned to this driver", async () => {
    const token = await createDriverSessionToken({
      sub: "driver-1",
      communityId: "golden-ocala",
      name: "Driver One",
    });

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      name: "Driver One",
      communityId: "golden-ocala",
      active: true,
    });

    mockPrisma.tramRequest.findUnique.mockResolvedValue({
      id: "req-1",
      communityId: "golden-ocala",
      driverName: "Driver Two", // Assigned to different driver
      status: "dispatched",
    });

    const req = makeRequest(
      "http://localhost/api/driver/driver-1/assignments/req-1",
      { method: "PATCH", body: { status: "en_route" }, bearerToken: token }
    );
    const params = Promise.resolve({ id: "driver-1", requestId: "req-1" });
    
    const res = await patchRequest(req as any, { params });
    expect(res.status).toBe(403);
    
    const body = await res.json();
    expect(body.error).toBe("Not your assignment");
  });

  it("returns 200 for valid status update", async () => {
    const token = await createDriverSessionToken({
      sub: "driver-1",
      communityId: "golden-ocala",
      name: "John Driver",
    });

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      name: "John Driver",
      communityId: "golden-ocala",
      active: true,
    });

    mockPrisma.tramRequest.findUnique.mockResolvedValue({
      id: "req-1",
      communityId: "golden-ocala",
      driverName: "John Driver",
      status: "dispatched",
      phone: null,
    });

    mockPrisma.tramRequest.update.mockResolvedValue({
      id: "req-1",
      status: "en_route",
    });

    const req = makeRequest(
      "http://localhost/api/driver/driver-1/assignments/req-1",
      { method: "PATCH", body: { status: "en_route" }, bearerToken: token }
    );
    const params = Promise.resolve({ id: "driver-1", requestId: "req-1" });
    
    const res = await patchRequest(req as any, { params });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/driver/[id]/auth", () => {
  const driverId = `test-driver-auth-${Date.now()}`;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPinRateLimit(`driver_pin:${driverId}`);
    clearPinRateLimit(`driver_pin_ip:local`);
  });

  afterEach(() => {
    clearPinRateLimit(`driver_pin:${driverId}`);
    clearPinRateLimit(`driver_pin_ip:local`);
  });

  it("returns 401 when driver has null PIN", async () => {
    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: driverId,
      pin: null, // No PIN set
      active: true,
      communityId: "golden-ocala",
      name: "Driver",
    });

    const req = makeRequest(
      `http://localhost/api/driver/${driverId}/auth`,
      { method: "POST", body: { pin: "1234" } }
    );
    const params = Promise.resolve({ id: driverId });
    
    const res = await postAuth(req as any, { params });
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toContain("PIN not configured");
  });

  it("returns 429 after rate limit exceeded", async () => {
    const rateLimitDriverId = `rate-limit-driver-${Date.now()}`;
    
    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: rateLimitDriverId,
      pin: hashDriverPin("9999"),
      active: true,
      communityId: "golden-ocala",
      name: "Driver",
    });

    // Make 5 failed attempts to trigger lockout
    for (let i = 0; i < 5; i++) {
      const req = makeRequest(
        `http://localhost/api/driver/${rateLimitDriverId}/auth`,
        { method: "POST", body: { pin: "wrong" } }
      );
      const params = Promise.resolve({ id: rateLimitDriverId });
      await postAuth(req as any, { params });
    }

    // 6th attempt should be rate limited
    const req = makeRequest(
      `http://localhost/api/driver/${rateLimitDriverId}/auth`,
      { method: "POST", body: { pin: "9999" } }
    );
    const params = Promise.resolve({ id: rateLimitDriverId });
    
    const res = await postAuth(req as any, { params });
    expect(res.status).toBe(429);
    
    const body = await res.json();
    expect(body.retryAfter).toBeGreaterThan(0);

    // Clean up
    clearPinRateLimit(`driver_pin:${rateLimitDriverId}`);
    clearPinRateLimit(`driver_pin_ip:local`);
  });

  it("returns 200 with token for valid PIN", async () => {
    const validDriverId = `valid-driver-${Date.now()}`;
    const hashedPin = hashDriverPin("5678");

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: validDriverId,
      pin: hashedPin,
      active: true,
      communityId: "golden-ocala",
      name: "Valid Driver",
    });

    const req = makeRequest(
      `http://localhost/api/driver/${validDriverId}/auth`,
      { method: "POST", body: { pin: "5678" } }
    );
    const params = Promise.resolve({ id: validDriverId });
    
    const res = await postAuth(req as any, { params });
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.driverId).toBe(validDriverId);
  });

  it("returns 401 for wrong PIN", async () => {
    const wrongPinDriverId = `wrong-pin-driver-${Date.now()}`;

    mockPrisma.tramDriver.findUnique.mockResolvedValue({
      id: wrongPinDriverId,
      pin: hashDriverPin("correct"),
      active: true,
      communityId: "golden-ocala",
      name: "Driver",
    });

    const req = makeRequest(
      `http://localhost/api/driver/${wrongPinDriverId}/auth`,
      { method: "POST", body: { pin: "wrong" } }
    );
    const params = Promise.resolve({ id: wrongPinDriverId });
    
    const res = await postAuth(req as any, { params });
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });
});
