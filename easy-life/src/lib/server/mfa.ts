import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { SignJWT, jwtVerify } from "jose";

const MFA_PENDING_MAX_AGE = 60 * 10; // 10 minutes
const RECOVERY_CODE_COUNT = 8;

function authKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode(
      "easy-life-dev-secret-change-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(input: {
  email: string;
  secret: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? "Easy Life";
  return authenticator.keyuri(input.email, issuer, input.secret);
}

export async function otpAuthQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase()).digest("hex");
}

/** One-time display codes (plain). Store only hashes. */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashRecoveryCodes(codes: string[]): string {
  return JSON.stringify(codes.map(hashRecoveryCode));
}

export function consumeRecoveryCode(
  hashesJson: string | null | undefined,
  code: string,
): { ok: true; nextHashes: string } | { ok: false } {
  if (!hashesJson) return { ok: false };
  let hashes: string[];
  try {
    hashes = JSON.parse(hashesJson) as string[];
  } catch {
    return { ok: false };
  }
  if (!Array.isArray(hashes)) return { ok: false };
  const target = hashRecoveryCode(code.trim());
  const idx = hashes.findIndex((h) => {
    try {
      const a = Buffer.from(h, "hex");
      const b = Buffer.from(target, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return h === target;
    }
  });
  if (idx < 0) return { ok: false };
  const next = hashes.filter((_, i) => i !== idx);
  return { ok: true, nextHashes: JSON.stringify(next) };
}

export type MfaPendingPayload = {
  purpose: "mfa-pending";
  sub: string;
  email: string;
  role: string;
  name: string;
  communityId?: string | null;
};

export async function createMfaPendingToken(
  payload: Omit<MfaPendingPayload, "purpose">,
): Promise<string> {
  return new SignJWT({ purpose: "mfa-pending", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_MAX_AGE}s`)
    .sign(authKey());
}

export async function verifyMfaPendingToken(
  token: string,
): Promise<Omit<MfaPendingPayload, "purpose"> | null> {
  try {
    const { payload } = await jwtVerify(token, authKey());
    if (payload.purpose !== "mfa-pending") return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: String(payload.role ?? "member"),
      name: String(payload.name ?? ""),
      communityId: (payload.communityId as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

/** Setup-pending token: user is logged in and confirming enrollment. */
export async function createMfaSetupToken(userId: string, secret: string) {
  return new SignJWT({ purpose: "mfa-setup", sub: userId, secret })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(authKey());
}

export async function verifyMfaSetupToken(
  token: string,
): Promise<{ userId: string; secret: string } | null> {
  try {
    const { payload } = await jwtVerify(token, authKey());
    if (payload.purpose !== "mfa-setup") return null;
    if (typeof payload.sub !== "string" || typeof payload.secret !== "string") {
      return null;
    }
    return { userId: payload.sub, secret: payload.secret };
  } catch {
    return null;
  }
}
