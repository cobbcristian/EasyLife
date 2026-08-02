"use client";

import { useEffect } from "react";
import {
  DEMO_TENANT_COOKIE,
  getDemoTenantById,
  tenantFaviconSrc,
} from "@/lib/tenant";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function setLinkIcon(rel: string, href: string, type?: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) link.type = type;
  else link.removeAttribute("type");
}

/** Keep the browser tab icon on the locked /go demo brand (not Vercel / Easy Life). */
export function BrandFavicon() {
  useEffect(() => {
    const tenantId = readCookie(DEMO_TENANT_COOKIE);
    const tenant = getDemoTenantById(tenantId);
    if (!tenant) return;
    const href = tenantFaviconSrc(tenant);
    const type = href.endsWith(".svg") ? "image/svg+xml" : undefined;
    setLinkIcon("icon", href, type);
    setLinkIcon("shortcut icon", href, type);
    setLinkIcon("apple-touch-icon", tenant.logoSrc);
  }, []);

  return null;
}
