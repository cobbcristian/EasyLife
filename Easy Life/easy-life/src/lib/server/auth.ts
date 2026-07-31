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

export function homeForRole(role: string): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "provider":
      return "/provider";
    case "board":
      return "/board";
    case "pm":
      return "/pm";
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
