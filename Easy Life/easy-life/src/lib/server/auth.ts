import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionPayload } from "@/lib/types";

export const SESSION_COOKIE = "el_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set in production. Generate a long random string and set it in Vercel env.",
      );
    }
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getKey());
}

const COMMUNITY_BY_ROLE: Record<string, string | null> = {
  admin: null,
  member: null,
  board: null,
  pm: null,
  provider: null,
  sales: null,
};

/** Legacy fallback — prefer passing communityId explicitly to createUser. */
export function defaultCommunityForRole(
  role: string,
  communityId?: string | null,
): string | null {
  if (communityId !== undefined) return communityId;
  return COMMUNITY_BY_ROLE[role] ?? null;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as SessionPayload["role"],
      name: payload.name as string,
      communityId: (payload.communityId as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

const RESET_MAX_AGE = 60 * 60; // 1 hour
const RESET_CHALLENGE_MAX_AGE = 60 * 15; // 15 minutes
const RESET_OTP_DIGITS = 6;

/** Random 6-digit OTP for the email-code reset step (~1e6 space). */
export function generatePasswordResetCode(): string {
  const max = 10 ** RESET_OTP_DIGITS;
  const min = 10 ** (RESET_OTP_DIGITS - 1);
  return String(randomInt(min, max));
}

export function hashPasswordResetCode(code: string): string {
  const normalized = code.replace(/\D/g, "").slice(0, RESET_OTP_DIGITS);
  const secret = process.env.AUTH_SECRET ?? "easy-life-dev-secret-change-in-production";
  return createHash("sha256")
    .update(`${normalized}:${secret}`)
    .digest("hex");
}

/**
 * Challenge JWT proves the client started a reset for this email.
 * The plaintext OTP is emailed (or shown only in non-production when mail is off).
 * Possession of this token alone cannot reset a password.
 */
export async function createPasswordResetChallenge(
  email: string,
  code: string,
): Promise<string> {
  return new SignJWT({
    purpose: "password-reset-challenge",
    email: email.toLowerCase(),
    codeHash: hashPasswordResetCode(code),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_CHALLENGE_MAX_AGE}s`)
    .sign(getKey());
}

export async function verifyPasswordResetChallenge(
  challengeToken: string,
  code: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(challengeToken, getKey());
    if (payload.purpose !== "password-reset-challenge") return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const codeHash = typeof payload.codeHash === "string" ? payload.codeHash : null;
    if (!email || !codeHash) return null;
    if (codeHash !== hashPasswordResetCode(code)) return null;
    return email;
  } catch {
    return null;
  }
}

/** Short-lived token accepted by /api/auth/reset-password after OTP verification. */
export async function createPasswordResetToken(email: string): Promise<string> {
  return new SignJWT({ purpose: "password-reset", email: email.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_MAX_AGE}s`)
    .sign(getKey());
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    if (payload.purpose !== "password-reset") return null;
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function homeForRole(
  role: string,
  communityId?: string | null,
): string {
  switch (role) {
    case "admin":
      // Platform master (no club) lands on Super Admin; club admins stay on dashboard.
      return communityId ? "/dashboard" : "/super-admin";
    case "provider":
      return "/provider";
    case "board":
      return "/board";
    case "pm":
      return "/pm";
    case "sales":
      return "/sales";
    default:
      return "/member";
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
  secure: process.env.NODE_ENV === "production",
};
