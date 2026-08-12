"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Sales story for /sell/tour — research-backed choices baked in:
 * - Buyer/resident as hero (not the product)
 * - Setup → tension → turning point → resolution
 * - Show > tell (≤ ~12 words per beat)
 * - One golden path: live a day in the building
 * - Close with a single clear next step
 */

type BeatKind = "open" | "screen" | "bridge" | "cta";

type Beat = {
  id: string;
  kind: BeatKind;
  chapter: string;
  line: string;
  /** Optional micro-caption under the line (≤ 6 words). */
  whisper?: string;
  shot?: string;
};

const DEMO_HREF = "/go/oceansideresidents";
const LOGO_ICON = "/brand/logo-icon.png";

/** One continuous afternoon — screens in the order a resident taps. */
const BEATS: Beat[] = [
  {
    id: "open",
    kind: "open",
    chapter: "The Plaza",
    line: "One building. Four roles. Zero binders.",
  },
  {
    id: "tension",
    kind: "bridge",
    chapter: "Before",
    line: "Paper, group chats, and “who has the PDF?”",
  },
  {
    id: "home",
    kind: "screen",
    chapter: "Resident",
    line: "Maya opens her community.",
    whisper: "Home",
    shot: "/sell/tour/01-member-home.png?v=3",
  },
  {
    id: "amenities",
    kind: "screen",
    chapter: "Resident",
    line: "She books the grill.",
    whisper: "Activities",
    shot: "/sell/tour/02-amenities.png?v=3",
  },
  {
    id: "calendar",
    kind: "screen",
    chapter: "Resident",
    line: "It lands on her day.",
    whisper: "Calendar",
    shot: "/sell/tour/03-calendar.png?v=3",
  },
  {
    id: "messages",
    kind: "screen",
    chapter: "Resident",
    line: "She asks the desk.",
    whisper: "Messages",
    shot: "/sell/tour/04-messages.png?v=3",
  },
  {
    id: "pros",
    kind: "screen",
    chapter: "Resident",
    line: "She hires a Local Pro.",
    whisper: "Services",
    shot: "/sell/tour/05-local-pros.png?v=3",
  },
  {
    id: "payments",
    kind: "screen",
    chapter: "Resident",
    line: "Charges, clear.",
    whisper: "Payments",
    shot: "/sell/tour/06-payments.png?v=3",
  },
  {
    id: "visitors",
    kind: "screen",
    chapter: "Resident",
    line: "Guests arrive expected.",
    whisper: "Visitors",
    shot: "/sell/tour/07-visitors.png?v=3",
  },
  {
    id: "ripple",
    kind: "bridge",
    chapter: "Same moment",
    line: "Her taps move the whole building.",
  },
  {
    id: "provider",
    kind: "screen",
    chapter: "Provider",
    line: "The pro sees the job.",
    whisper: "Work queue",
    shot: "/sell/tour/13-provider-home.png?v=3",
  },
  {
    id: "pm",
    kind: "screen",
    chapter: "Property",
    line: "PM sees today’s pulse.",
    whisper: "Operations",
    shot: "/sell/tour/08-pm-home.png?v=3",
  },
  {
    id: "desk",
    kind: "screen",
    chapter: "Property",
    line: "Front desk checks them in.",
    whisper: "Front desk",
    shot: "/sell/tour/09-pm-front-desk.png?v=3",
  },
  {
    id: "pm-bookings",
    kind: "screen",
    chapter: "Property",
    line: "Work queue, live.",
    whisper: "Maintenance",
    shot: "/sell/tour/10-pm-bookings.png?v=3",
  },
  {
    id: "board",
    kind: "screen",
    chapter: "Board",
    line: "Board sees one source of truth.",
    whisper: "Governance",
    shot: "/sell/tour/11-board-home.png?v=3",
  },
  {
    id: "budget",
    kind: "screen",
    chapter: "Board",
    line: "Reserves without the chase.",
    whisper: "Budget",
    shot: "/sell/tour/12-board-budget.png?v=3",
  },
  {
    id: "cta",
    kind: "cta",
    chapter: "Next",
    line: "Walk it yourself.",
  },
];

const CHAPTER_TONE: Record<string, string> = {
  "The Plaza": "#9ec5ff",
  Before: "rgba(232,238,245,0.55)",
  Resident: "#9ec5ff",
  "Same moment": "var(--el-ember)",
  Provider: "var(--el-ember)",
  Property: "#f0c674",
  Board: "#c9b4ff",
  Next: "var(--el-signal-soft)",
};

export function TourPitchClient() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const last = BEATS.length - 1;
  const beat = BEATS[index]!;

  const go = useCallback(
    (next: number) => setIndex(Math.max(0, Math.min(last, next))),
    [last],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(last);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, last]);

  function onClickSurface(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.55) go(index + 1);
    else if (x < rect.width * 0.45) go(index - 1);
  }

  return (
    <div
      className="tour-root relative min-h-dvh overflow-hidden bg-[var(--el-void)] text-[var(--el-mist)]"
      style={{ fontFamily: "var(--font-el-sans), system-ui, sans-serif" }}
      onClick={onClickSurface}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null) return;
        const dx = end - start;
        if (Math.abs(dx) < 48) return;
        if (dx < 0) go(index + 1);
        else go(index - 1);
      }}
    >
      <Atmosphere chapter={beat.chapter} />

      <header className="relative z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={LOGO_ICON}
            alt=""
            className="h-7 w-7 rounded-lg object-cover ring-1 ring-white/15"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold tracking-[-0.01em] text-white">
              Easy Life
            </p>
            <p
              className="truncate text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: CHAPTER_TONE[beat.chapter] ?? "#9ec5ff" }}
            >
              {beat.chapter}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-white/40">
          {index + 1} / {BEATS.length}
        </p>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-6.25rem)] max-w-5xl flex-col justify-center px-3 pb-16 sm:px-6">
        {BEATS.map((b, i) => {
          const active = i === index;
          return (
            <div
              key={b.id}
              aria-hidden={!active}
              className={cn(
                "absolute inset-x-3 top-14 bottom-14 flex flex-col justify-center sm:inset-x-6",
                reducedMotion
                  ? active
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                  : active
                    ? "translate-y-0 opacity-100 transition-all duration-500 ease-out"
                    : "pointer-events-none translate-y-4 opacity-0 transition-all duration-500 ease-out",
              )}
            >
              <BeatBody beat={b} active={active} reducedMotion={reducedMotion} />
            </div>
          );
        })}
      </div>

      <footer className="relative z-30 flex items-center justify-center gap-1 px-4 pb-5">
        {BEATS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            aria-label={`Beat ${i + 1}`}
            aria-current={i === index}
            onClick={(e) => {
              e.stopPropagation();
              go(i);
            }}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === index ? "w-6" : "w-1 bg-white/20 hover:bg-white/40",
            )}
            style={
              i === index
                ? {
                    backgroundColor:
                      CHAPTER_TONE[b.chapter] ?? "var(--el-signal-soft)",
                  }
                : undefined
            }
          />
        ))}
      </footer>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left",
          !reducedMotion && "transition-transform duration-500 ease-out",
        )}
        style={{
          backgroundColor: CHAPTER_TONE[beat.chapter] ?? "var(--el-signal-soft)",
          transform: `scaleX(${(index + 1) / BEATS.length})`,
        }}
      />
    </div>
  );
}

function BeatBody({
  beat,
  active,
  reducedMotion,
}: {
  beat: Beat;
  active: boolean;
  reducedMotion: boolean;
}) {
  if (beat.kind === "open") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <img
          src={LOGO_ICON}
          alt="Easy Life"
          className={cn(
            "mb-8 h-16 w-16 rounded-[1.15rem] object-cover ring-1 ring-white/20 shadow-[0_20px_60px_rgba(10,132,255,0.25)]",
            active && !reducedMotion && "tour-logo-in",
          )}
        />
        <Line>{beat.line}</Line>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.28em] text-white/35">
          Tap or →
        </p>
      </div>
    );
  }

  if (beat.kind === "bridge") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <Line>{beat.line}</Line>
      </div>
    );
  }

  if (beat.kind === "cta") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <Line>{beat.line}</Line>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={DEMO_HREF}
            className="inline-flex rounded-full bg-[var(--el-signal)] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(10,132,255,0.35)] hover:brightness-110"
            onClick={(e) => e.stopPropagation()}
          >
            Open live Oceanside
          </Link>
        </div>
        <p className="mt-5 text-[12px] text-white/40">
          Same tenant. Every role.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5 lg:flex-row lg:items-center lg:gap-12">
      <div className="order-2 w-full max-w-sm shrink-0 text-center lg:order-1 lg:w-[38%] lg:max-w-none lg:text-left">
        {beat.whisper ? (
          <p
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: CHAPTER_TONE[beat.chapter] ?? "#9ec5ff" }}
          >
            {beat.whisper}
          </p>
        ) : null}
        <Line className="text-[1.65rem] sm:text-3xl lg:text-[2.35rem]">
          {beat.line}
        </Line>
      </div>

      <div
        className={cn(
          "order-1 flex justify-center lg:order-2 lg:flex-1",
          active && !reducedMotion && "tour-phone-in",
        )}
      >
        <PhoneFrame>
          {beat.shot ? (
            <Image
              src={beat.shot}
              alt={beat.line}
              width={393}
              height={852}
              className="h-full w-full object-cover object-top"
              priority={active}
              unoptimized
            />
          ) : null}
        </PhoneFrame>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-[min(72vw,280px)] sm:w-[300px] lg:w-[320px]"
      style={{ aspectRatio: "393 / 852" }}
    >
      <div className="absolute inset-0 rounded-[2.15rem] bg-gradient-to-b from-white/25 via-white/5 to-white/10 p-[2px] shadow-[0_40px_100px_rgba(0,0,0,0.65)]">
        <div className="relative h-full w-full overflow-hidden rounded-[2.05rem] bg-[#0b0d10] ring-1 ring-black/40">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black/85"
          />
          <div className="absolute inset-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Atmosphere({ chapter }: { chapter: string }) {
  const warm =
    chapter === "Provider" ||
    chapter === "Same moment" ||
    chapter === "Property";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-[background] duration-700"
      style={{
        background: warm
          ? `
            radial-gradient(ellipse 65% 45% at 80% 15%, rgba(125,211,192,0.14), transparent 55%),
            radial-gradient(ellipse 50% 40% at 10% 90%, rgba(240,198,116,0.08), transparent 50%),
            linear-gradient(165deg, #07090c 0%, #10151c 55%, #141a22 100%)
          `
          : `
            radial-gradient(ellipse 70% 50% at 85% 0%, rgba(10,132,255,0.2), transparent 55%),
            radial-gradient(ellipse 45% 35% at 5% 100%, rgba(158,197,255,0.06), transparent 50%),
            linear-gradient(165deg, #07090c 0%, #0e1319 50%, #151b24 100%)
          `,
      }}
    />
  );
}

function Line({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-balance font-medium leading-[1.12] tracking-[-0.025em] text-white",
        "text-[1.85rem] sm:text-4xl",
        className,
      )}
      style={{ fontFamily: "var(--font-el-display), Georgia, serif" }}
    >
      {children}
    </h1>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
