/**
 * Demo / seed helpers for production hardening.
 * Staging demos can opt in with ALLOW_DEMO_SEED=1 (and related flags).
 */

function flagEnabled(name: string): boolean | null {
  const raw = process.env[name];
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return null;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Seed accounts, communities, and fixture records. Off in production unless ALLOW_DEMO_SEED=1. */
export function isDemoSeedAllowed(): boolean {
  const flag = flagEnabled("ALLOW_DEMO_SEED");
  if (flag !== null) return flag;
  return !isProductionRuntime();
}

/** Fake local payment cards (add_demo). Off in production unless ALLOW_DEMO_PAYMENTS=1. */
export function isDemoPaymentAllowed(): boolean {
  const flag = flagEnabled("ALLOW_DEMO_PAYMENTS");
  if (flag !== null) return flag;
  return !isProductionRuntime();
}
