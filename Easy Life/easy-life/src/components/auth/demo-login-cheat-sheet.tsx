"use client";

import Link from "next/link";
import type { DemoLogin } from "@/lib/tenant";

/** Sales-only helper under locked `/go` login — tap an email to fill the form. */
export function DemoLoginCheatSheet({
  productName,
  logins,
  onPickEmail,
}: {
  productName: string;
  logins: DemoLogin[];
  onPickEmail: (email: string, password: string) => void;
}) {
  if (logins.length === 0) return null;

  const uniquePasswords = [...new Set(logins.map((l) => l.password))];

  return (
    <div className="mt-8 rounded-xl border border-[#e8ebf0] bg-[#f7f8fa] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-grey">
            Sales demo
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink">
            {productName} logins
          </p>
          {uniquePasswords.length === 1 ? (
            <p className="mt-0.5 text-[12px] text-grey">
              Password:{" "}
              <span className="font-semibold text-ink">{uniquePasswords[0]}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] text-grey">
              Passwords listed per account below
            </p>
          )}
        </div>
        <Link
          href="/go"
          className="shrink-0 text-[12px] font-medium text-[#007aff] hover:underline"
        >
          All clubs
        </Link>
      </div>
      <ul className="mt-3 max-h-[min(22rem,50vh)] space-y-1.5 overflow-y-auto">
        {logins.map((login) => (
          <li key={login.email}>
            <button
              type="button"
              onClick={() => onPickEmail(login.email, login.password)}
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left hover:bg-white/80"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-grey">
                  {login.role}
                </span>
                <span className="block truncate font-mono text-[12px] text-ink">
                  {login.email}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-grey">
                  password: {login.password}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-medium text-[#007aff]">
                Use
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
