export function authorizeCronRequest(
  request: Request,
  env: { cronSecret?: string; nodeEnv?: string } = {
    cronSecret: process.env.CRON_SECRET,
    nodeEnv: process.env.NODE_ENV,
  },
): { ok: true; secured: boolean } | { ok: false; status: number; error: string } {
  const secret = env.cronSecret;

  // Dev/preview: allow unauthenticated cron when secret is unset.
  // Production: require CRON_SECRET (Vercel sends Authorization: Bearer <CRON_SECRET>).
  if (!secret) {
    if (env.nodeEnv === "production") {
      return {
        ok: false,
        status: 503,
        error: "CRON_SECRET is required in production",
      };
    }
    return { ok: true, secured: false };
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, secured: true };
}
