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

/**
 * Origin for HTTP redirects. Azure App Service often presents an internal
 * container host on `request.url` (e.g. https://138a33c99b39:8080) which
 * breaks WebViews / Safari with "server can't be found".
 */
export function publicRequestOrigin(request: {
  url: string;
  headers: { get(name: string): string | null };
}): string {
  const configured = getAppUrl();
  if (
    configured &&
    !configured.includes("localhost") &&
    !/:\d{4,5}$/.test(new URL(configured).host)
  ) {
    return configured;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";

  if (host && !isInternalContainerHost(host)) {
    return `${forwardedProto}://${host}`;
  }

  try {
    const fromUrl = new URL(request.url);
    if (!isInternalContainerHost(fromUrl.host)) {
      return fromUrl.origin;
    }
  } catch {
    /* fall through */
  }

  return configured;
}

function isInternalContainerHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h.includes("localhost") || h.startsWith("127.")) return false;
  // Azure container id style host: hex + :8080
  if (/^[0-9a-f]{8,}:\d+$/i.test(h)) return true;
  if (/:\d{4,5}$/.test(h) && !h.includes(".")) return true;
  return false;
}

export function publicAbsoluteUrl(
  request: { url: string; headers: { get(name: string): string | null } },
  path: string,
): URL {
  return new URL(path, publicRequestOrigin(request));
}
