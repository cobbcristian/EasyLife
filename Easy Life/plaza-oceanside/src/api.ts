import { API_BASE_URL, COMMUNITY_ID } from "./config";

export type LoginResult =
  | {
      ok: true;
      token?: string;
      redirectTo?: string;
      pending?: boolean;
      mfaRequired?: boolean;
      mfaToken?: string;
    }
  | { ok: false; error: string; pending?: boolean };

export async function loginResident(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/mobile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        communityId: COMMUNITY_ID,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      token?: string;
      redirectTo?: string;
      pending?: boolean;
      mfaRequired?: boolean;
      mfaToken?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? "Sign-in failed",
        pending: data.pending,
      };
    }
    if (data.mfaRequired && data.mfaToken) {
      return { ok: true, mfaRequired: true, mfaToken: data.mfaToken };
    }
    if (!data.token) {
      return { ok: false, error: "No session token returned" };
    }
    return { ok: true, token: data.token, redirectTo: data.redirectTo };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

export async function verifyMfaLogin(
  mfaToken: string,
  code: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mfaToken,
        code: code.trim(),
        mobile: true,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      token?: string;
      redirectTo?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Invalid code" };
    }
    if (!data.token) {
      return { ok: false, error: "No session token returned" };
    }
    return { ok: true, token: data.token, redirectTo: data.redirectTo };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

export async function registerResident(input: {
  email: string;
  password: string;
  name: string;
  unit: string;
}): Promise<LoginResult & { pending?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "join",
        email: input.email.trim().toLowerCase(),
        password: input.password,
        name: input.name.trim(),
        communityId: COMMUNITY_ID,
        unit: input.unit.trim(),
        role: "member",
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      pending?: boolean;
      redirectTo?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Registration failed" };
    }
    if (data.pending) {
      return { ok: true, pending: true };
    }
    return { ok: true, redirectTo: data.redirectTo };
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}

/** Sets httpOnly cookies then redirects into role home (or an explicit path). */
export function sessionBridgeUrl(token: string, nextPath?: string): string {
  const q = new URLSearchParams({ token });
  if (nextPath) q.set("next", nextPath);
  // Bust WebView HTTP cache when the shell app updates.
  q.set("_v", "13");
  return `${API_BASE_URL}/api/mobile/bridge?${q.toString()}`;
}

export function memberPortalUrl(): string {
  return `${API_BASE_URL}/member`;
}

export function registerWebUrl(): string {
  return `${API_BASE_URL}/register?mode=join&communityId=${COMMUNITY_ID}`;
}
