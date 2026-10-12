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

function clearHeadIcons() {
  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    )
    .forEach((el) => el.remove());
}

function setLinkIcon(rel: string, href: string, type?: string) {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  document.head.appendChild(link);
}

/** Force the locked /go demo brand into the browser tab (not Vercel / Easy Life). */
export function BrandFavicon() {
  useEffect(() => {
    function apply() {
      const tenantId = readCookie(DEMO_TENANT_COOKIE);
      const tenant = getDemoTenantById(tenantId);
      if (!tenant) return;
      const href = `${tenantFaviconSrc(tenant)}?v=plaza-tab-3`;
      const type = href.includes(".svg") ? "image/svg+xml" : "image/png";
      clearHeadIcons();
      setLinkIcon("icon", href, type);
      setLinkIcon("shortcut icon", href, type);
      setLinkIcon("apple-touch-icon", `${tenant.logoSrc}?v=plaza-tab-3`);
    }

    apply();
    // Re-apply after Next soft navigations / late metadata injection.
    const t1 = window.setTimeout(apply, 50);
    const t2 = window.setTimeout(apply, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
