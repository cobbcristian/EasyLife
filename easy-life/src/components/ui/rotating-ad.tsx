"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

export interface RotatingAdItem {
  id: string;
  sponsor: string;
  text: string;
  color?: string;
  linkUrl?: string | null;
}

export function RotatingAd({ ads }: { ads?: RotatingAdItem[] }) {
  const items = ads?.length ? ads : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const ad = items[index];
  const color = ad.color ?? "from-[var(--mvp-blue)] to-[#0051d4]";

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r ${color} px-5 py-4 text-white`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
          Sponsored · {ad.sponsor}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{ad.text}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden gap-1 sm:flex">
          {items.map((a, i) => (
            <span
              key={a.id}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
        {ad.linkUrl ? (
          <a
            href={ad.linkUrl}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/30"
          >
            Learn more
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
