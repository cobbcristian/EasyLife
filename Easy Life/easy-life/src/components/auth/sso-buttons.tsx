"use client";

import { useEffect, useState } from "react";

type Provider = "google" | "microsoft" | "apple";

const LABELS: Record<Provider, string> = {
  google: "Continue with Google",
  microsoft: "Continue with Microsoft",
  apple: "Continue with Apple",
};

export function SsoButtons({ className }: { className?: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    fetch("/api/auth/oauth")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.providers ?? []) as Provider[];
        setProviders(list);
      })
      .catch(() => {});
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className={className}>
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-[#e5e5ea]" />
        </div>
        <span className="relative bg-white px-3 text-[12px] text-grey">
          Or sign in with
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {providers.map((p) => (
          <a
            key={p}
            href={`/api/auth/oauth/${p}`}
            className="flex h-11 items-center justify-center rounded-lg border border-[#c8c8c8] bg-white text-[14px] font-semibold text-ink hover:bg-[#f7f7f8]"
          >
            {LABELS[p]}
          </a>
        ))}
      </div>
    </div>
  );
}
