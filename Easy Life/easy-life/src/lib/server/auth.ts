import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import type { SessionPayload } from "@/lib/types";

export const SESSION_COOKIE = "el_session";

/** Stay signed in until logout (social-app style), not bank-style auto sign-out. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 days
const MAX_AGE = SESSION_MAX_AGE_SECONDS;

/** Renew JWT when less than 30 days remain so active users rarely hit expiry. */
const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 30;

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

export function sessionFromJwtPayload(payload: JWTPayload): SessionPayload {
  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as SessionPayload["role"],
    name: payload.name as string,
    communityId: (payload.communityId as string | null | undefined) ?? null,
  };
}

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
 * Verify JWT and ensure the underlying account is still allowed to use the app.
 * Freeze / pending only blocked new logins before — long-lived JWTs kept working.
 * Keeps JWT role/communityId (multi-club switch); only rejects inactive accounts.
 */
export async function verifyActiveSessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  const session = await verifySessionToken(token);
  if (!session?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { status: true },
  });
  if (!user) return null;
  if (user.status === "frozen" || user.status === "pending") return null;

  return session;
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
  // Re-check account is still active before extending the cookie.
  const live = await verifyActiveSessionToken(currentToken);
  if (!live) return currentToken;
  return createSessionToken(live);
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

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyActiveSessionToken(store.get(SESSION_COOKIE)?.value);
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
