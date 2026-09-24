import { createHash, timingSafeEqual } from "crypto";

/**
 * Authorize a Grab & Go kiosk/edge device request.
 * 
 * - Production: requires GRAB_GO_MACHINE_KEY (returns 503 if unset)
 * - Dev/test: allows open access when key is unset (demo mode)
 * - Uses constant-time comparison via SHA-256 hashes
 */
export function authorizeGrabGoMachine(
  request: Request,
  env: { machineKey?: string; nodeEnv?: string } = {
    machineKey: process.env.GRAB_GO_MACHINE_KEY,
    nodeEnv: process.env.NODE_ENV,
  }
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  const key = env.machineKey;
  const isProduction = env.nodeEnv === "production";

  // Fail closed in production when key is not configured
  if (!key) {
    if (isProduction) {
      return {
        ok: false,
        status: 503,
        error: "Service unavailable: machine key not configured",
      };
    }
    // Allow open access in dev/test (demo mode)
    return { ok: true };
  }

  const providedKey = request.headers.get("x-grab-go-key") || "";

  // Constant-time comparison using SHA-256 hashes
  // This avoids length-based timing attacks and simplifies buffer handling
  const expectedHash = createHash("sha256").update(key).digest();
  const providedHash = createHash("sha256").update(providedKey).digest();

  if (!timingSafeEqual(expectedHash, providedHash)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
