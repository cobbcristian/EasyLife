import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/types";
import { prisma } from "@/lib/server/prisma";

export const SESSION_COOKIE = "el_session";

/**
 * Session TTL: 14 days with sliding refresh.
 * This is a balance between UX (not logging out too often) and security
 * (limiting exposure window for stolen tokens). The DB re-check on every
 * session resolution handles frozen/demoted users immediately.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days
const MAX_AGE = SESSION_MAX_AGE_SECONDS;

/** Renew JWT when less than 7 days remain so active users rarely hit expiry. */
const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 7;

let _cachedKey: Uint8Array | null = null;

function getKey(): Uint8Array {
  if (_cachedKey) return _cachedKey;

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set in production. Generate a long random string and set it in Vercel env.",
      );
    }
    _cachedKey = new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
    return _cachedKey;
  }
  _cachedKey = new TextEncoder().encode(secret);
  return _cachedKey;
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

export function sessionFromJwtPayload(payload: JWTPayload): SessionPayload {
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as SessionPayload["role"],
    name: payload.name as string,
    communityId: (payload.communityId as string | null | undefined) ?? null,
  };
}

/**
 * Verify a JWT token signature and expiry only (no DB check).
 * Use verifySessionTokenWithDbCheck for full session validation.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey());
    return sessionFromJwtPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Lookup user status/role directly from DB for session validation.
 * This allows frozen users and role changes to take effect immediately.
 */
async function getUserStatusFromDb(
  email: string,
): Promise<{ status: "active" | "pending" | "frozen"; role: string; communityId: string | null } | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { status: true, role: true, communityId: true },
    });
    if (!user) return null;
    return {
      status: (user.status as "active" | "pending" | "frozen") ?? "active",
      role: user.role,
      communityId: user.communityId,
    };
  } catch {
    // DB not available (e.g., during certain tests) - return null to fall back
    return null;
  }
}

/**
 * Verify a session token AND re-check user status/role from DB.
 * Returns null if:
 * - Token is invalid/expired
 * - User not found in DB
 * - User status is frozen or pending
 *
 * Returns updated session with current role/communityId from DB.
 */
export async function verifySessionTokenWithDbCheck(
  token: string | undefined,
): Promise<SessionPayload | null> {
  const jwtSession = await verifySessionToken(token);
  if (!jwtSession) return null;

  const dbUser = await getUserStatusFromDb(jwtSession.email);

  // If DB lookup fails (e.g., during tests or DB unavailable), fall back to JWT-only
  // In production with valid DB, this should always succeed
  if (!dbUser) {
    // Check if this is a test environment or DB is unavailable
    // In production, a missing user means they were deleted - deny access
    if (process.env.NODE_ENV === "production") {
      return null;
    }
    // In dev/test, allow JWT-only fallback for flexibility
    return jwtSession;
  }

  if (dbUser.status === "frozen" || dbUser.status === "pending") {
    // User is frozen or pending - deny access
    return null;
  }

  // Return session with current DB values for role/communityId
  // This ensures role demotions take effect immediately
  return {
    ...jwtSession,
    role: dbUser.role as SessionPayload["role"],
    communityId: dbUser.communityId,
  };
}

export async function getSessionTokenExpiry(
  token: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Issue a new JWT when the current one is nearing expiry (sliding session). */
export async function maybeRefreshSessionToken(
  session: SessionPayload,
  currentToken: string,
): Promise<string> {
  const exp = await getSessionTokenExpiry(currentToken);
  if (!exp) return currentToken;
  const remaining = exp - Math.floor(Date.now() / 1000);
  if (remaining > SESSION_REFRESH_THRESHOLD_SECONDS) {
    return currentToken;
  }
  return createSessionToken(session);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
}

const RESET_MAX_AGE = 60 * 60; // 1 hour

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

/**
 * Get the current session from cookies, WITH DB re-check for user status/role.
 * Use this for all authenticated endpoints - frozen/demoted users are blocked.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionTokenWithDbCheck(store.get(SESSION_COOKIE)?.value);
}

/**
 * Get the current session from cookies WITHOUT DB re-check.
 * Only use this when you explicitly need the JWT-only session (e.g., for logout).
 */
export async function getSessionWithoutDbCheck(): Promise<SessionPayload | null> {
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
  maxAge: SESSION_MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
