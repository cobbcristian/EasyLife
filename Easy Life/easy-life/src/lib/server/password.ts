import {
  pbkdf2Sync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

// Format: scrypt$<saltHex>$<hashHex>
const SCRYPT_PREFIX = "scrypt";
/** OAuth-only accounts — password login rejected. */
const OAUTH_PREFIX = "oauth$";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${SCRYPT_PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Random unusable password marker for SSO-created accounts. */
export function hashOAuthPlaceholder(provider: string): string {
  return `${OAUTH_PREFIX}${provider}$${randomBytes(16).toString("hex")}`;
}

export function isOAuthPassword(stored: string): boolean {
  return stored.startsWith(OAUTH_PREFIX);
}

export function isScryptHash(stored: string): boolean {
  return stored.startsWith(`${SCRYPT_PREFIX}$`);
}

/**
 * ASP.NET Core Identity PasswordHasher payload (base64).
 * V2 marker 0x00 · V3 marker 0x01.
 */
export function isAspNetIdentityHash(stored: string): boolean {
  if (
    !stored ||
    stored.startsWith(`${SCRYPT_PREFIX}$`) ||
    stored.startsWith(OAUTH_PREFIX)
  ) {
    return false;
  }
  try {
    const buf = Buffer.from(stored.trim(), "base64");
    if (buf.length < 17) return false;
    return buf[0] === 0x00 || buf[0] === 0x01;
  } catch {
    return false;
  }
}

function digestForPrf(prf: number): string | null {
  switch (prf) {
    case 0:
      return "sha1";
    case 1:
      return "sha256";
    case 2:
      return "sha512";
    default:
      return null;
  }
}

export function verifyAspNetIdentityPassword(
  password: string,
  stored: string,
): boolean {
  let buf: Buffer;
  try {
    buf = Buffer.from(stored.trim(), "base64");
  } catch {
    return false;
  }
  if (buf.length < 17) return false;

  const version = buf[0];
  if (version === 0x00) {
    // Identity V2: 0x00 | salt(16) | subkey(32), PBKDF2-HMAC-SHA1, 1000 iters
    if (buf.length !== 49) return false;
    const salt = buf.subarray(1, 17);
    const expected = buf.subarray(17, 49);
    const actual = pbkdf2Sync(password, salt, 1000, expected.length, "sha1");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  if (version === 0x01) {
    // Identity V3: 0x01 | prf | iter | saltLen | salt | subkey
    if (buf.length < 13) return false;
    const prf = buf.readUInt32BE(1);
    const iterations = buf.readUInt32BE(5);
    const saltLength = buf.readUInt32BE(9);
    if (iterations < 1 || saltLength < 8 || saltLength > 128) return false;
    if (buf.length < 13 + saltLength + 16) return false;
    const digest = digestForPrf(prf);
    if (!digest) return false;
    const salt = buf.subarray(13, 13 + saltLength);
    const expected = buf.subarray(13 + saltLength);
    const actual = pbkdf2Sync(
      password,
      salt,
      iterations,
      expected.length,
      digest,
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  return false;
}

function verifyScryptPassword(password: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (isOAuthPassword(stored)) return false;
  if (isScryptHash(stored)) return verifyScryptPassword(password, stored);
  if (isAspNetIdentityHash(stored)) {
    return verifyAspNetIdentityPassword(password, stored);
  }
  // Backwards-compat: allow plaintext seeds that haven't been hashed.
  return password === stored;
}

/** Re-hash to scrypt after a successful ASP.NET / plaintext login. */
export function passwordNeedsRehash(stored: string): boolean {
  if (!stored || isOAuthPassword(stored)) return false;
  return !isScryptHash(stored);
}

/** Build a V3 Identity hash for unit tests. */
export function encodeAspNetIdentityV3ForTests(input: {
  password: string;
  salt: Buffer;
  iterations?: number;
  prf?: 0 | 1 | 2;
  subkeyLength?: number;
}): string {
  const iterations = input.iterations ?? 100_000;
  const prf = input.prf ?? 1;
  const subkeyLength = input.subkeyLength ?? 32;
  const digest = digestForPrf(prf)!;
  const subkey = pbkdf2Sync(
    input.password,
    input.salt,
    iterations,
    subkeyLength,
    digest,
  );
  const buf = Buffer.alloc(13 + input.salt.length + subkey.length);
  buf[0] = 0x01;
  buf.writeUInt32BE(prf, 1);
  buf.writeUInt32BE(iterations, 5);
  buf.writeUInt32BE(input.salt.length, 9);
  input.salt.copy(buf, 13);
  subkey.copy(buf, 13 + input.salt.length);
  return buf.toString("base64");
}
