import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";

export const DRIVER_SESSION_COOKIE = "el_driver_session";
export const DRIVER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

const SCRYPT_PREFIX = "scrypt";

export interface DriverSessionPayload {
  sub: string; // driverId
  communityId: string;
  name: string;
}

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set in production. Generate a long random string and set it in Vercel env."
      );
    }
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createDriverSessionToken(
  payload: DriverSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DRIVER_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey());
}

function sessionFromJwtPayload(payload: JWTPayload): DriverSessionPayload {
  return {
    sub: payload.sub as string,
    communityId: payload.communityId as string,
    name: payload.name as string,
  };
}

export async function verifyDriverSessionToken(
  token: string | undefined
): Promise<DriverSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    return sessionFromJwtPayload(payload);
  } catch {
    return null;
  }
}

export async function getDriverSession(): Promise<DriverSessionPayload | null> {
  const store = await cookies();
  return verifyDriverSessionToken(store.get(DRIVER_SESSION_COOKIE)?.value);
}

export function bearerDriverToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function getDriverSessionFromRequest(
  request: Request
): Promise<DriverSessionPayload | null> {
  const bearer = bearerDriverToken(request);
  if (bearer) {
    return verifyDriverSessionToken(bearer);
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${DRIVER_SESSION_COOKIE}=([^;]+)`));
  return match ? verifyDriverSessionToken(match[1]) : null;
}

export const driverSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DRIVER_SESSION_MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

// PIN hashing utilities

export function hashDriverPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${SCRYPT_PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function isScryptHash(stored: string): boolean {
  return stored.startsWith(`${SCRYPT_PREFIX}$`);
}

function verifyScryptPin(pin: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

/**
 * Constant-time PIN comparison.
 * Supports both hashed (scrypt) and legacy plaintext PINs.
 */
export function verifyDriverPin(pin: string, storedPin: string | null): boolean {
  if (!storedPin || !pin) return false;
  
  if (isScryptHash(storedPin)) {
    return verifyScryptPin(pin, storedPin);
  }
  
  // Plaintext comparison with constant-time (pad to equal length)
  const pinBuf = Buffer.from(pin.padEnd(64, "\0"));
  const storedBuf = Buffer.from(storedPin.padEnd(64, "\0"));
  return timingSafeEqual(pinBuf, storedBuf);
}

export function pinNeedsRehash(storedPin: string | null): boolean {
  if (!storedPin) return false;
  return !isScryptHash(storedPin);
}

// Rate limiting for PIN attempts

const pinAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if a PIN attempt is allowed and record it.
 * Returns { allowed: true } or { allowed: false, retryAfter } (seconds until unlock).
 */
export function checkPinRateLimit(
  key: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const record = pinAttempts.get(key);

  if (record?.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Reset if locked period expired
  if (record?.lockedUntil && record.lockedUntil <= now) {
    pinAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed PIN attempt. Returns lockout info if threshold exceeded.
 */
export function recordFailedPinAttempt(
  key: string
): { locked: false } | { locked: true; retryAfter: number } {
  const now = Date.now();
  let record = pinAttempts.get(key);

  if (!record) {
    record = { count: 0, lockedUntil: null };
  }

  record.count += 1;

  if (record.count >= MAX_PIN_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    pinAttempts.set(key, record);
    return { locked: true, retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  pinAttempts.set(key, record);
  
  // Cleanup old entries periodically
  if (pinAttempts.size > 10000) {
    for (const [k, v] of pinAttempts) {
      if (!v.lockedUntil || v.lockedUntil < now) {
        pinAttempts.delete(k);
      }
    }
  }

  return { locked: false };
}

/**
 * Clear rate limit record after successful auth.
 */
export function clearPinRateLimit(key: string): void {
  pinAttempts.delete(key);
}

/**
 * Update driver PIN to hashed version.
 */
export async function updateDriverPinHash(
  driverId: string,
  newHashedPin: string
): Promise<void> {
  await prisma.tramDriver.update({
    where: { id: driverId },
    data: { pin: newHashedPin },
  });
}
