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

const DEMO_HREF = "/go/oceansideresidents";
const DIRECTORY_HREF = "/go";
const LOGO = "/brand/community-oceanside.png";

export function PlazaPitchClient() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const slides = buildSlides();
  const last = slides.length - 1;
  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(last, next)));
    },
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
      className="relative min-h-dvh overflow-hidden bg-[var(--pitch-navy)] text-[var(--pitch-foam)]"
      style={{
        fontFamily: "var(--font-pitch-sans), system-ui, sans-serif",
      }}
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
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 70% 10%, rgba(26,90,122,0.55), transparent 55%),
            radial-gradient(ellipse 70% 50% at 15% 90%, rgba(201,184,150,0.12), transparent 50%),
            linear-gradient(165deg, var(--pitch-navy) 0%, var(--pitch-atlantic) 48%, var(--pitch-ink) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--pitch-sand)]/80">
          Easy Life · Boardroom
        </p>
        <p className="text-[11px] tabular-nums text-white/45">
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
                    ? "opacity-100 translate-y-0 transition-all duration-500 ease-out"
                    : "pointer-events-none opacity-0 translate-y-3 transition-all duration-500 ease-out",
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
                ? "w-8 bg-[var(--pitch-sand)]"
                : "w-1.5 bg-white/25 hover:bg-white/45",
            )}
          />
        ))}
      </footer>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-[var(--pitch-sand)]",
          reducedMotion ? "" : "transition-transform duration-500 ease-out",
        )}
        style={{
          transform: `scaleX(${(index + 1) / slides.length})`,
        }}
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
      style={{ fontFamily: "var(--font-pitch-display), Georgia, serif" }}
    >
      {children}
    </h1>
  );
}

function Soft({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("max-w-xl text-pretty text-lg font-light leading-relaxed text-white/70 sm:text-xl", className)}>
      {children}
    </p>
  );
}

function Crest({ breathe }: { breathe?: boolean }) {
  return (
    <img
      src={LOGO}
      alt="The Plaza at Oceanside"
      className={cn(
        "mx-auto h-auto w-[min(72vw,22rem)] object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        breathe && "pitch-breathe",
      )}
    />
  );
}

function buildSlides(): Slide[] {
  return [
    {
      id: "title",
      render: ({ active }) => (
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <Crest breathe={active} />
          <Display className="mt-10 text-4xl sm:text-6xl md:text-7xl">
            Your community.
            <br />
            One living room.
          </Display>
          <Soft className="mt-6 mx-auto">
            The Plaza at Oceanside runs on Easy Life today — proof for boardrooms that this isn’t a mock.
          </Soft>
          <Link
            href={DEMO_HREF}
            className="mt-10 inline-flex items-center rounded-full bg-[var(--pitch-sand)] px-7 py-3 text-sm font-semibold tracking-wide text-[var(--pitch-ink)] transition hover:brightness-110"
            onClick={(e) => e.stopPropagation()}
          >
            See the live resident experience
          </Link>
        </div>
      ),
    },
    {
      id: "problem",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            The problem
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Communities still run on email chaos.
          </Display>
          <Soft className="mt-6">
            Paper notices. Facebook groups nobody owns. Vendors nowhere to find.
            Board and PM always last to know.
          </Soft>
        </div>
      ),
    },
    {
      id: "one-place",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            The answer
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            One club operating system.
          </Display>
          <Soft className="mt-6">
            Residents, board, property management, and local providers — same platform, right permissions, your branding.
          </Soft>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {["Members", "Board", "PM / Front desk", "Local providers"].map((label) => (
              <li
                key={label}
                className="border-l border-[var(--pitch-sand)]/50 pl-4 text-base text-white/85"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Resident life
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Amenities, events, messages — without the group chat.
          </Display>
          <Soft className="mt-6">
            Book amenities. Follow the calendar. Message management. Discover trusted local pros inside the community — all in one place.
          </Soft>
        </div>
      ),
    },
    {
      id: "local-economy",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Local economy
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Trusted providers, not random Google ads.
          </Display>
          <Soft className="mt-6">
            Flooring, cleaning, handymen — providers who serve your buildings, listed where residents already live digitally.
          </Soft>
        </div>
      ),
    },
    {
      id: "board-pm",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Board &amp; PM
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Visibility without more firefighting.
          </Display>
          <Soft className="mt-6">
            Communications that reach residents. Approvals and directory control. Less chasing, more running the community.
          </Soft>
        </div>
      ),
    },
    {
      id: "white-glove",
      render: () => (
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            How you buy it
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl">
            White-glove or shared — your call.
          </Display>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--pitch-sand)]">
                White-glove
              </p>
              <p className="mt-3 text-2xl font-medium text-white" style={{ fontFamily: "var(--font-pitch-display), Georgia, serif" }}>
                Dedicated branded app
              </p>
              <p className="mt-3 text-base font-light text-white/65">
                Store listing, your crest, closed feel — premium. The Plaza at Oceanside is live this way.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--pitch-sand)]">
                Shared Easy Life
              </p>
              <p className="mt-3 text-2xl font-medium text-white" style={{ fontFamily: "var(--font-pitch-display), Georgia, serif" }}>
                One login. Club switcher.
              </p>
              <p className="mt-3 text-base font-light text-white/65">
                Skip the extra branded-app fee. Residents who belong to two clubs switch communities in the same account — each club keeps its own branding and data.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "live-proof",
      render: () => (
        <div className="mx-auto max-w-3xl text-center">
          <Crest />
          <Display className="mt-8 text-4xl sm:text-5xl md:text-6xl">
            Live. Not a slideware dream.
          </Display>
          <Soft className="mx-auto mt-6">
            Web for residents and staff. Native iOS (TestFlight) and Android (Play closed testing) for Oceanside. You can open it before you leave the room.
          </Soft>
        </div>
      ),
    },
    {
      id: "security",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Control
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Roles and walls that hold.
          </Display>
          <Soft className="mt-6">
            Member · Board · PM · Admin · Provider. Each community’s data stays scoped. Staff approve who belongs.
          </Soft>
        </div>
      ),
    },
    {
      id: "rollout",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Rollout
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl">
            Soft launch first. Prestige when you’re ready.
          </Display>
          <ol className="mt-10 space-y-4 text-lg font-light text-white/80">
            <li>
              <span className="mr-3 text-[var(--pitch-sand)]">01</span>
              Onboard the community and staff
            </li>
            <li>
              <span className="mr-3 text-[var(--pitch-sand)]">02</span>
              Invite residents · shared app or web
            </li>
            <li>
              <span className="mr-3 text-[var(--pitch-sand)]">03</span>
              Soft launch · learn · tune
            </li>
            <li>
              <span className="mr-3 text-[var(--pitch-sand)]">04</span>
              Optional white-glove branded app later
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "why-now",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Why now
          </p>
          <Display className="mt-4 text-4xl sm:text-5xl md:text-6xl">
            Own the member relationship.
          </Display>
          <Soft className="mt-6">
            Facebook doesn’t work for you. Email doesn’t scale. A modern community deserves a modern front door — retention, clarity, calm.
          </Soft>
        </div>
      ),
    },
    {
      id: "cta",
      render: () => (
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Open the Plaza. Then map yours.
          </Display>
          <Soft className="mx-auto mt-6">
            Walk the live demo with us — then we’ll size shared vs white-glove for your community.
          </Soft>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={DEMO_HREF}
              className="inline-flex items-center rounded-full bg-[var(--pitch-sand)] px-7 py-3 text-sm font-semibold text-[var(--pitch-ink)] transition hover:brightness-110"
              onClick={(e) => e.stopPropagation()}
            >
              Open Oceanside demo
            </Link>
            <Link
              href={DIRECTORY_HREF}
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              Other club demos
            </Link>
          </div>
          <p className="mt-8 text-xs tracking-wide text-white/40">
            ← → or Space · click sides · swipe on mobile
          </p>
        </div>
      ),
    },
    {
      id: "qa",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--pitch-sand)]">
            Quick answers
          </p>
          <Display className="mt-4 text-3xl sm:text-4xl">If they ask…</Display>
          <dl className="mt-8 space-y-6 text-base">
            <div>
              <dt className="font-semibold text-white">Someone in two clubs?</dt>
              <dd className="mt-1 font-light text-white/65">
                Shared Easy Life: one login, switch clubs. No second password. Each club stays separate.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Must we pay for a branded app?</dt>
              <dd className="mt-1 font-light text-white/65">
                No. White-glove is optional prestige. Shared gets you live without the store-binary fee.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">How fast?</dt>
              <dd className="mt-1 font-light text-white/65">
                Soft launch in weeks once board signs and staff are onboarded — then invite residents in waves.
              </dd>
            </div>
          </dl>
        </div>
      ),
    },
  ];
}
