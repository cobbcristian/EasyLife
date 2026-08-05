/** Public base URL for emails, links, and redirects (no trailing slash). */
export function getAppUrl(): string {
  const raw =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}

export function appPath(path: string): string {
  const base = getAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
