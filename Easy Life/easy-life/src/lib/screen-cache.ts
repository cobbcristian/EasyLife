/** Last member screens, kept on the phone so a tap can paint before Azure answers.
 * Keys are scoped by member email so a shared device cannot show the prior user's
 * home, bookings, or private messages after logout / account switch.
 */

const PREFIX = "barnaby-screen:";

function normalizeUser(userKey: string): string {
  return userKey.trim().toLowerCase();
}

function fullKey(userKey: string, key: string): string {
  return `${PREFIX}${normalizeUser(userKey)}:${key}`;
}

export function readScreen<T>(userKey: string, key: string): T | null {
  if (typeof window === "undefined") return null;
  if (!normalizeUser(userKey)) return null;
  try {
    const raw = window.localStorage.getItem(fullKey(userKey, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeScreen(userKey: string, key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  if (!normalizeUser(userKey)) return;
  try {
    window.localStorage.setItem(fullKey(userKey, key), JSON.stringify(value));
  } catch {
    /* Storage full or blocked — the live request still updates the screen. */
  }
}

/** Drop every cached member screen (call on logout so the next account starts clean). */
export function clearScreenCache(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) window.localStorage.removeItem(k);
  } catch {
    /* ignore quota / private-mode failures */
  }
}
