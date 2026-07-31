"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DemoLogin } from "@/lib/tenant";
import { demoLoginsForTenant } from "@/lib/tenant";

type SalesTenant = {
  id: Parameters<typeof demoLoginsForTenant>[0]["id"];
  communityName: string;
  defaultLoginEmail: string;
  logoSrc: string;
};

export function GoSalesClient({ tenants }: { tenants: SalesTenant[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Belt-and-suspenders: cookie-based root metadata can lag; force Easy Life title.
  useEffect(() => {
    document.title = "Easy Life | Sales demos";
  }, []);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <ul className="divide-y divide-[#eceff3] overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
      {tenants.map((t) => {
        const logins = demoLoginsForTenant(t);
        const expanded = openId === t.id;
        const uniquePasswords = [...new Set(logins.map((l) => l.password))];
        return (
          <li key={t.id} className="px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f2f4f7]">
                  <Image
                    src={t.logoSrc}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {t.communityName}
                  </p>
                  <p className="truncate text-[12px] text-grey">
                    {t.defaultLoginEmail}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-grey">
                    /go/{t.id}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {(["Member", "Board", "PM", "Provider", "Admin"] as const).map((role) => {
                  const login = logins.find((l) => {
                    const r = l.role.toLowerCase();
                    if (role === "PM") {
                      return r === "pm" || r.includes("property manager");
                    }
                    return r === role.toLowerCase() || r.includes(role.toLowerCase());
                  });
                  if (!login) return null;
                  return (
                    <Link
                      key={role}
                      href={`/go/${t.id}?email=${encodeURIComponent(login.email)}&password=${encodeURIComponent(login.password)}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-[13px] font-semibold text-ink hover:bg-[#f7f8fa]"
                    >
                      {login.role}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : t.id)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e8ebf0] bg-white px-4 text-[14px] font-medium text-ink hover:bg-[#f7f8fa]"
                >
                  {expanded ? "Hide logins" : "All logins"}
                </button>
                <Link
                  href={`/go/${t.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#007aff] px-4 text-[14px] font-medium text-white hover:opacity-95"
                >
                  Open demo
                </Link>
              </div>
            </div>

            {expanded ? (
              <div className="mt-4 rounded-xl border border-[#eceff3] bg-[#f7f8fa] p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-grey">
                  {logins.length} demo logins
                  {uniquePasswords.length === 1
                    ? ` · password: ${uniquePasswords[0]}`
                    : ""}
                </p>
                <ul className="space-y-2">
                  {logins.map((login: DemoLogin) => (
                    <li
                      key={login.email}
                      className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-grey">
                          {login.role}
                        </p>
                        <p className="truncate font-mono text-[13px] text-ink">
                          {login.email}
                        </p>
                        <p className="mt-0.5 font-mono text-[12px] text-grey">
                          password: {login.password}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <Link
                          href={`/go/${t.id}?email=${encodeURIComponent(login.email)}&password=${encodeURIComponent(login.password)}`}
                          className="text-[13px] font-semibold text-[#007aff] hover:underline"
                        >
                          Sign in
                        </Link>
                        <button
                          type="button"
                          onClick={() => copyText(login.email, login.email)}
                          className="text-[13px] font-medium text-[#007aff] hover:underline"
                        >
                          {copied === login.email ? "Copied" : "Copy email"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(`${login.email}:pw`, login.password)
                          }
                          className="text-[13px] font-medium text-[#007aff] hover:underline"
                        >
                          {copied === `${login.email}:pw`
                            ? "Copied"
                            : "Copy password"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
