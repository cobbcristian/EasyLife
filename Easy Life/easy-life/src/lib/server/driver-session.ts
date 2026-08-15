import { SignJWT, jwtVerify } from "jose";

const DRIVER_PURPOSE = "tram-driver";
const MAX_AGE_SEC = 60 * 60 * 12; // 12 hours — shift length

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production.");
    }
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Short-lived JWT proving PIN auth for a tram driver portal session. */
export async function createDriverSessionToken(driverId: string): Promise<string> {
  return new SignJWT({ purpose: DRIVER_PURPOSE, driverId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(driverId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getKey());
}

export async function verifyDriverSessionToken(
  token: string | undefined,
  expectedDriverId: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (payload.purpose !== DRIVER_PURPOSE) return false;
    const driverId =
      typeof payload.driverId === "string"
        ? payload.driverId
        : typeof payload.sub === "string"
          ? payload.sub
          : null;
    return driverId === expectedDriverId;
  } catch {
    return false;
  }
}

export function driverBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}
