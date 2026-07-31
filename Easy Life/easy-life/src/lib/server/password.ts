import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Format: scrypt$<saltHex>$<hashHex>
const PREFIX = "scrypt";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  // Backwards-compat: allow plaintext seeds that haven't been hashed.
  if (!stored.startsWith(`${PREFIX}$`)) {
    return password === stored;
  }
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
