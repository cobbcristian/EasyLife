/** Last member screens, kept on the phone so a tap can paint before Azure answers. */

const PREFIX = "barnaby-screen:";

function normalizeEmail(userEmail: string): string {
  return userEmail.trim().toLowerCase();
}

function storageKey(userEmail: string, key: string): string {
  return `${PREFIX}${normalizeEmail(userEmail)}:${key}`;
}

export function readScreen<T>(userEmail: string, key: string): T | null {
  if (typeof window === "undefined") return null;
  const email = normalizeEmail(userEmail);
  if (!email) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(email, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeScreen(userEmail: string, key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  const email = normalizeEmail(userEmail);
  if (!email) return;
  try {
    window.localStorage.setItem(storageKey(email, key), JSON.stringify(value));
  } catch {
    /* Storage full or blocked — the live request still updates the screen. */
  }
}

/** Drop every cached member screen. Call on logout so the next account cannot paint prior PII. */
export function clearScreenCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) toRemove.push(key);
    }
    for (const key of toRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
