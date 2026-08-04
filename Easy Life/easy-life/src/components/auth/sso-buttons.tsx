"use client";

import { useEffect, useState, type ReactNode } from "react";

type Provider = "google" | "microsoft" | "apple";

const LABELS: Record<Provider, string> = {
  google: "Continue with Google",
  microsoft: "Continue with Microsoft",
  apple: "Continue with Apple",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.3 5.2C36.9 41.7 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M12 1h10v10H12z" />
      <path fill="#7fba00" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.4 12.1c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.7-2.2c.9-1.3 1.2-2.5 1.2-2.6-.3-.1-2.2-.9-2.3-3.8zM14.6 5.3c.6-.8 1.1-1.8.9-2.9-1 .1-2.2.7-2.8 1.4-.6.7-1.1 1.8-.9 2.8 1.1.1 2.2-.5 2.8-1.3z" />
    </svg>
  );
}

const ICONS: Record<Provider, () => ReactNode> = {
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
  apple: AppleIcon,
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
        {providers.map((p) => {
          const Icon = ICONS[p];
          return (
            <a
              key={p}
              href={`/api/auth/oauth/${p}`}
              className="relative flex h-11 items-center justify-center rounded-lg border border-[#c8c8c8] bg-white text-[14px] font-semibold text-ink hover:bg-[#f7f7f8]"
            >
              <span className="absolute left-4 inline-flex h-[18px] w-[18px] items-center justify-center">
                <Icon />
              </span>
              {LABELS[p]}
            </a>
          );
        })}
      </div>
    </div>
  );
}
