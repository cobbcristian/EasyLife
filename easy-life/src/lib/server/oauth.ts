import { SignJWT, importPKCS8 } from "jose";
import { createHash, randomBytes } from "crypto";
import { appPath } from "@/lib/server/app-url";

export type OAuthProvider = "google" | "microsoft" | "apple";

export type OAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

const STATE_COOKIE = "oauth_state";
const PROVIDER_COOKIE = "oauth_provider";

export function oauthCookieNames() {
  return { state: STATE_COOKIE, provider: PROVIDER_COOKIE };
}

export function listConfiguredOAuthProviders(): OAuthProvider[] {
  const out: OAuthProvider[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    out.push("google");
  }
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    out.push("microsoft");
  }
  if (
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  ) {
    out.push("apple");
  }
  return out;
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "microsoft" || value === "apple";
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return appPath(`/api/auth/oauth/${provider}/callback`);
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

function microsoftTenant(): string {
  return process.env.MICROSOFT_TENANT_ID?.trim() || "common";
}

async function appleClientSecret(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  let key = process.env.APPLE_PRIVATE_KEY!;
  // Allow \n-escaped PEM in env vars
  key = key.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(key, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 30)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(privateKey);
}

export async function buildOAuthAuthorizeUrl(
  provider: OAuthProvider,
  state: string,
): Promise<string> {
  const redirectUri = oauthCallbackUrl(provider);
  switch (provider) {
    case "google": {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "online",
        prompt: "select_account",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    case "microsoft": {
      const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: "code",
        response_mode: "query",
        scope: "openid email profile User.Read",
        state,
      });
      return `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/authorize?${params}`;
    }
    case "apple": {
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: "code",
        response_mode: "form_post",
        scope: "name email",
        state,
      });
      return `https://appleid.apple.com/auth/authorize?${params}`;
    }
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

async function exchangeCode(
  provider: OAuthProvider,
  code: string,
): Promise<{ accessToken?: string; idToken?: string }> {
  const redirectUri = oauthCallbackUrl(provider);
  if (provider === "google") {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error("Google token exchange failed");
    const data = (await res.json()) as {
      access_token?: string;
      id_token?: string;
    };
    return { accessToken: data.access_token, idToken: data.id_token };
  }

  if (provider === "microsoft") {
    const res = await fetch(
      `https://login.microsoftonline.com/${microsoftTenant()}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      },
    );
    if (!res.ok) throw new Error("Microsoft token exchange failed");
    const data = (await res.json()) as {
      access_token?: string;
      id_token?: string;
    };
    return { accessToken: data.access_token, idToken: data.id_token };
  }

  // apple
  const clientSecret = await appleClientSecret();
  const res = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Apple token exchange failed");
  const data = (await res.json()) as { id_token?: string; access_token?: string };
  return { accessToken: data.access_token, idToken: data.id_token };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

export async function fetchOAuthProfile(
  provider: OAuthProvider,
  code: string,
  appleUserName?: string,
): Promise<OAuthProfile> {
  const tokens = await exchangeCode(provider, code);

  if (provider === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error("Google userinfo failed");
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };
    if (!data.email || !data.sub) throw new Error("Google profile missing email");
    return {
      provider,
      providerUserId: data.sub,
      email: data.email.toLowerCase(),
      name: data.name?.trim() || data.email.split("@")[0]!,
      emailVerified: Boolean(data.email_verified),
    };
  }

  if (provider === "microsoft") {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!res.ok) throw new Error("Microsoft profile failed");
    const data = (await res.json()) as {
      id?: string;
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };
    const email = (data.mail || data.userPrincipalName || "").toLowerCase();
    if (!email || !data.id) throw new Error("Microsoft profile missing email");
    return {
      provider,
      providerUserId: data.id,
      email,
      name: data.displayName?.trim() || email.split("@")[0]!,
      emailVerified: true,
    };
  }

  // apple — email often only in id_token
  if (!tokens.idToken) throw new Error("Apple id_token missing");
  const payload = decodeJwtPayload(tokens.idToken);
  const email = String(payload.email ?? "").toLowerCase();
  const sub = String(payload.sub ?? "");
  if (!email || !sub) throw new Error("Apple profile missing email");
  const name =
    appleUserName?.trim() ||
    email.split("@")[0] ||
    "Apple User";
  return {
    provider,
    providerUserId: sub,
    email,
    name,
    emailVerified: Boolean(payload.email_verified ?? true),
  };
}

/** Deterministic placeholder email helper for rare no-email SSO payloads. */
export function syntheticOAuthEmail(provider: OAuthProvider, sub: string): string {
  const digest = createHash("sha256").update(`${provider}:${sub}`).digest("hex").slice(0, 12);
  return `${provider}.${digest}@sso.easylife.local`;
}
