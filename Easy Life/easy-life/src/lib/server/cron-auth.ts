export function authorizeCronRequest(
  request: Request,
  env: { cronSecret?: string; nodeEnv?: string; hosted?: boolean } = {
    cronSecret: process.env.CRON_SECRET,
    nodeEnv: process.env.NODE_ENV,
    hosted: Boolean(process.env.WEBSITE_SITE_NAME),
  },
): { ok: true; secured: boolean } | { ok: false; status: number; error: string } {
  const secret = env.cronSecret;

  // Local dev can run cron without a secret. Production and Azure cannot.
  if (!secret) {
    if (env.nodeEnv === "production" || env.hosted) {
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
