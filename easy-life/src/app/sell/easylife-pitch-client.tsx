"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Slide = {
  id: string;
  render: (opts: { active: boolean }) => ReactNode;
};

const DIRECTORY_HREF = "/go";
const PLAZA_PITCH_HREF = "/sell/plaza";
const LOGO_ICON = "/brand/logo-icon.png";

export function EasyLifePitchClient() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const slides = buildSlides();
  const last = slides.length - 1;

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

  function onClickSurface(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a,button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width * 0.55) go(index + 1);
    else if (x < rect.width * 0.45) go(index - 1);
  }

  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-[var(--el-void)] text-[var(--el-mist)]"
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 85% -10%, rgba(10,132,255,0.28), transparent 55%),
            radial-gradient(ellipse 60% 40% at 0% 100%, rgba(63,155,255,0.12), transparent 50%),
            linear-gradient(165deg, var(--el-void) 0%, var(--el-slate) 45%, var(--el-steel) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <img
            src={LOGO_ICON}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--el-signal-soft)]">
            Easy Life
          </p>
        </div>
        <p className="text-[11px] tabular-nums text-white/40">
          {index + 1} / {slides.length}
        </p>
      </header>

      <div className="relative z-10 flex min-h-[calc(100dvh-7.5rem)] items-center justify-center px-5 pb-8 sm:px-10">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.id}
              aria-hidden={!active}
              className={cn(
                "absolute inset-x-5 top-16 bottom-24 flex items-center justify-center sm:inset-x-10",
                reducedMotion
                  ? active
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                  : active
                    ? "translate-y-0 opacity-100 transition-all duration-500 ease-out"
                    : "pointer-events-none translate-y-3 opacity-0 transition-all duration-500 ease-out",
              )}
            >
              {slide.render({ active })}
            </div>
          );
        })}
      </div>

      <footer className="relative z-20 flex items-center justify-center gap-2 px-5 pb-6">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={(e) => {
              e.stopPropagation();
              go(i);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-8 bg-[var(--el-signal)]"
                : "w-1.5 bg-white/20 hover:bg-white/40",
            )}
          />
        ))}
      </footer>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-[var(--el-signal)]",
          !reducedMotion && "transition-transform duration-500 ease-out",
        )}
        style={{ transform: `scaleX(${(index + 1) / slides.length})` }}
      />
    </div>
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

function Display({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-balance font-medium leading-[1.05] tracking-[-0.02em] text-white",
        className,
      )}
      style={{ fontFamily: "var(--font-el-display), Georgia, serif" }}
    >
      {children}
    </h1>
  );
}

function Soft({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "max-w-xl text-pretty text-lg font-light leading-relaxed text-[var(--el-mute)] sm:text-xl",
        className,
      )}
    >
      {children}
    </p>
  );
}

function buildSlides(): Slide[] {
  return [
    {
      id: "title",
      render: ({ active }) => (
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <img
            src={LOGO_ICON}
            alt="Easy Life"
            className={cn(
              "h-20 w-20 rounded-[1.35rem] object-cover shadow-2xl shadow-[var(--el-signal)]/30 sm:h-24 sm:w-24",
              active && "el-pitch-breathe",
            )}
          />
          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.32em] text-[var(--el-signal-soft)]">
            Easy Life
          </p>
          <Display className="mt-4 text-4xl sm:text-6xl md:text-7xl">
            The operating system for club life.
          </Display>
          <Soft className="mx-auto mt-6">
            One platform for residents, board, property managers, and local
            providers — branded for each community you close.
          </Soft>
          <Link
            href={DIRECTORY_HREF}
            className="mt-10 inline-flex items-center rounded-full bg-[var(--el-signal)] px-7 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            onClick={(e) => e.stopPropagation()}
          >
            Open live club demos
          </Link>
        </div>
      ),
    },
    {
      id: "problem",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            The problem
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Clubs still run on inboxes and group chats.
          </Display>
          <Soft className="mt-6">
            Paper notices. Facebook nobody owns. Vendors buried in Google.
            Board and PM always putting out fires.
          </Soft>
        </div>
      ),
    },
    {
      id: "product",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Product
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Easy Life is the home for every role.
          </Display>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              "Residents & households",
              "Board & committees",
              "PM / front desk",
              "Local providers",
            ].map((label) => (
              <li
                key={label}
                className="border-l-2 border-[var(--el-signal)] pl-4 text-base text-white/85"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "resident",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Resident life
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Book. Message. Discover. Belong.
          </Display>
          <Soft className="mt-6">
            Amenities, calendar, staff messaging, and trusted local pros —
            without leaving the community app.
          </Soft>
        </div>
      ),
    },
    {
      id: "economy",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Local economy
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Providers that serve your doors, not the internet.
          </Display>
          <Soft className="mt-6">
            Flooring, cleaning, handymen — listed where residents already spend
            time. Your community becomes the storefront.
          </Soft>
        </div>
      ),
    },
    {
      id: "ops",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Board &amp; PM
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Ops clarity. Fewer fires.
          </Display>
          <Soft className="mt-6">
            Reach every resident. Approve who belongs. See what’s happening —
            without another email thread.
          </Soft>
        </div>
      ),
    },
    {
      id: "packaging",
      render: () => (
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            How clubs buy Easy Life
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl">
            White-glove or shared.
          </Display>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--el-signal-soft)]">
                White-glove
              </p>
              <p
                className="mt-3 text-2xl font-medium text-white"
                style={{
                  fontFamily: "var(--font-el-display), Georgia, serif",
                }}
              >
                Dedicated branded app
              </p>
              <p className="mt-3 text-base font-light text-[var(--el-mute)]">
                Store listing, club crest, closed feel — premium. Optional.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--el-signal-soft)]">
                Shared Easy Life
              </p>
              <p
                className="mt-3 text-2xl font-medium text-white"
                style={{
                  fontFamily: "var(--font-el-display), Georgia, serif",
                }}
              >
                One login. Club switcher.
              </p>
              <p className="mt-3 text-base font-light text-[var(--el-mute)]">
                No extra branded-app fee. Members in two communities switch clubs
                in the same account — each club keeps its branding and data.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "proof",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Proof
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Live communities. Not slides.
          </Display>
          <Soft className="mt-6">
            Multiple club demos on one deploy. Oceanside ships web plus native
            TestFlight and Play closed testing — real residents, real providers.
          </Soft>
          <Link
            href={PLAZA_PITCH_HREF}
            className="mt-8 inline-flex text-sm font-semibold text-[var(--el-signal-soft)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Oceanside boardroom deck →
          </Link>
        </div>
      ),
    },
    {
      id: "trust",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Trust
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Roles and community walls.
          </Display>
          <Soft className="mt-6">
            Member · Board · PM · Admin · Provider. Data stays scoped to each
            community. Staff approve who gets in.
          </Soft>
        </div>
      ),
    },
    {
      id: "rollout",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Rollout
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl">
            Soft launch. Prestige when ready.
          </Display>
          <ol className="mt-10 space-y-4 text-lg font-light text-white/80">
            {[
              "Onboard community + staff",
              "Invite residents on shared Easy Life",
              "Soft launch · learn · tune",
              "Optional white-glove branded app",
            ].map((step, i) => (
              <li key={step}>
                <span className="mr-3 tabular-nums text-[var(--el-signal)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "why",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Why Easy Life
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Own the member relationship.
          </Display>
          <Soft className="mt-6">
            Facebook works against you. Email doesn’t scale. Give every club a
            modern front door — retention, clarity, calm under your brand.
          </Soft>
        </div>
      ),
    },
    {
      id: "cta",
      render: () => (
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src={LOGO_ICON}
            alt="Easy Life"
            className="mb-8 h-16 w-16 rounded-2xl object-cover shadow-lg shadow-[var(--el-signal)]/25"
          />
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Let’s map Easy Life to your community.
          </Display>
          <Soft className="mx-auto mt-6">
            Open a live club demo, or walk the Oceanside proof with your board.
          </Soft>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={DIRECTORY_HREF}
              className="inline-flex items-center rounded-full bg-[var(--el-signal)] px-7 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={(e) => e.stopPropagation()}
            >
              Club demos
            </Link>
            <Link
              href="/sell/tour"
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              Screenshot tour
            </Link>
            <Link
              href="/sell/story"
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              Product story
            </Link>
            <Link
              href={PLAZA_PITCH_HREF}
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              Plaza pitch
            </Link>
          </div>
          <p className="mt-8 text-xs tracking-wide text-white/35">
            ← → or Space · click sides · swipe
          </p>
        </div>
      ),
    },
    {
      id: "qa",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--el-signal-soft)]">
            Quick answers
          </p>
          <Display className="mt-4 text-3xl sm:text-4xl">If they ask…</Display>
          <dl className="mt-8 space-y-6 text-base">
            <div>
              <dt className="font-semibold text-white">Member of two clubs?</dt>
              <dd className="mt-1 font-light text-[var(--el-mute)]">
                Shared Easy Life: one login, club switcher. No second account.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">
                Required branded app fee?
              </dt>
              <dd className="mt-1 font-light text-[var(--el-mute)]">
                No. White-glove is optional. Shared gets you live without a
                custom store binary.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Timeline?</dt>
              <dd className="mt-1 font-light text-[var(--el-mute)]">
                Soft launch in weeks after board sign-off and staff onboarding —
                then invite residents in waves.
              </dd>
            </div>
          </dl>
        </div>
      ),
    },
  ];
}
