"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Role = "Narrator" | "Resident" | "Provider" | "PM" | "Board";

type Slide = {
  id: string;
  role: Role;
  title: string;
  body: string;
  shot?: string;
  cta?: boolean;
};

const DEMO_HREF = "/go/oceansideresidents";
const LOGO_ICON = "/brand/logo-icon.png";

const ROLE_COLOR: Record<Role, string> = {
  Narrator: "var(--el-signal-soft)",
  Resident: "#9ec5ff",
  Provider: "var(--el-ember)",
  PM: "#f0c674",
  Board: "#d4b5ff",
};

const SLIDES: Slide[] = [
  {
    id: "open",
    role: "Narrator",
    title: "See Easy Life, not a mockup.",
    body: "Real Oceanside product screens — resident, provider, PM, and board — as the story unfolds.",
  },
  {
    id: "home",
    role: "Resident",
    title: "Maya opens her community home.",
    body: "Greeting, Ask Plaza, categories, upcoming bookings — her life, not a feed.",
    shot: "/sell/tour/01-member-home.png",
  },
  {
    id: "amenities",
    role: "Resident",
    title: "She books real amenities.",
    body: "Tennis, theater, grills, board room, simulator — live inventory with real times.",
    shot: "/sell/tour/02-amenities.png",
  },
  {
    id: "calendar",
    role: "Resident",
    title: "It shows up on her calendar.",
    body: "What’s reserved, what’s pending, what she can cancel — without a paper binder.",
    shot: "/sell/tour/03-calendar.png",
  },
  {
    id: "messages",
    role: "Resident",
    title: "She messages management.",
    body: "A real thread to staff — not a Facebook post that vanishes.",
    shot: "/sell/tour/04-messages.png",
  },
  {
    id: "pros",
    role: "Resident",
    title: "She finds a trusted Local Pro.",
    body: "Floor installation inside the community — View → book → chat.",
    shot: "/sell/tour/05-local-pros.png",
  },
  {
    id: "payments",
    role: "Resident",
    title: "Dues and charges in one place.",
    body: "HOA portal when needed. Account statement for amenity spend.",
    shot: "/sell/tour/06-payments.png",
  },
  {
    id: "visitors",
    role: "Resident",
    title: "Guests are expected before they arrive.",
    body: "Pre-register visitors so the desk isn’t guessing.",
    shot: "/sell/tour/07-visitors.png",
  },
  {
    id: "provider",
    role: "Provider",
    title: "The provider sees the work.",
    body: "Same platform, provider desk — jobs, messages, money.",
    shot: "/sell/tour/13-provider-home.png",
  },
  {
    id: "pm",
    role: "PM",
    title: "PM sees today’s operations.",
    body: "Front-desk load, maintenance, the pulse of the building.",
    shot: "/sell/tour/08-pm-home.png",
  },
  {
    id: "desk",
    role: "PM",
    title: "Front desk checks guests in.",
    body: "Name, host, photo — expected visitors from the calendar show here.",
    shot: "/sell/tour/09-pm-front-desk.png",
  },
  {
    id: "pm-bookings",
    role: "PM",
    title: "Staff see amenity demand.",
    body: "Who booked what — conflicts and capacity without spreadsheet chaos.",
    shot: "/sell/tour/10-pm-bookings.png",
  },
  {
    id: "board",
    role: "Board",
    title: "Board opens the same source of truth.",
    body: "Meetings, surveys, governance — before anyone says “send me the file.”",
    shot: "/sell/tour/11-board-home.png",
  },
  {
    id: "budget",
    role: "Board",
    title: "Budget and reserves, visible.",
    body: "Spend clarity for boardroom decisions — not a last-minute PDF.",
    shot: "/sell/tour/12-board-budget.png",
  },
  {
    id: "cta",
    role: "Narrator",
    title: "Now click through it yourself.",
    body: "Same Oceanside tenant these screens came from — try every role.",
    cta: true,
  },
];

export function TourPitchClient() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const last = SLIDES.length - 1;
  const slide = SLIDES[index]!;

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
      <header className="relative z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={LOGO_ICON}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Easy Life · Product tour
            </p>
            <p
              className="truncate text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: ROLE_COLOR[slide.role] }}
            >
              {slide.role}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-white/40">
          {index + 1} / {SLIDES.length}
        </p>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-6.5rem)] max-w-6xl flex-col justify-center px-3 pb-20 sm:px-6">
        {SLIDES.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              aria-hidden={!active}
              className={cn(
                "absolute inset-x-3 top-14 bottom-16 flex flex-col justify-center sm:inset-x-6",
                reducedMotion
                  ? active
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                  : active
                    ? "translate-y-0 opacity-100 transition-all duration-500 ease-out"
                    : "pointer-events-none translate-y-3 opacity-0 transition-all duration-500 ease-out",
              )}
            >
              <SlideBody slide={s} />
            </div>
          );
        })}
      </div>

      <footer className="relative z-30 flex items-center justify-center gap-1.5 px-4 pb-5">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            onClick={(e) => {
              e.stopPropagation();
              go(i);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-7" : "w-1.5 bg-white/20 hover:bg-white/40",
            )}
            style={
              i === index ? { backgroundColor: ROLE_COLOR[s.role] } : undefined
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
          backgroundColor: ROLE_COLOR[slide.role],
          transform: `scaleX(${(index + 1) / SLIDES.length})`,
        }}
      />
    </div>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.cta) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Display>{slide.title}</Display>
        <Soft className="mx-auto mt-4">{slide.body}</Soft>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={DEMO_HREF}
            className="inline-flex rounded-full bg-[var(--el-signal)] px-7 py-3 text-sm font-semibold text-white hover:brightness-110"
            onClick={(e) => e.stopPropagation()}
          >
            Open live Oceanside
          </Link>
          <Link
            href="/sell/story"
            className="inline-flex rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            Text-only story
          </Link>
          <Link
            href="/sell"
            className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm text-white/65"
            onClick={(e) => e.stopPropagation()}
          >
            Platform pitch
          </Link>
        </div>
      </div>
    );
  }

  if (!slide.shot) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <img
          src={LOGO_ICON}
          alt="Easy Life"
          className="mx-auto mb-6 h-14 w-14 rounded-2xl object-cover"
        />
        <Display>{slide.title}</Display>
        <Soft className="mx-auto mt-4">{slide.body}</Soft>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <div className="shrink-0 lg:w-[34%]">
        <Display className="text-3xl sm:text-4xl lg:text-5xl">{slide.title}</Display>
        <Soft className="mt-3 text-base sm:text-lg">{slide.body}</Soft>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <Image
          src={slide.shot}
          alt={slide.title}
          width={1280}
          height={800}
          className="h-auto w-full object-cover object-top"
          priority
        />
      </div>
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
        "text-balance font-medium leading-[1.08] tracking-[-0.02em] text-white",
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
        "max-w-xl text-pretty font-light leading-relaxed text-[var(--el-mute)]",
        className,
      )}
    >
      {children}
    </p>
  );
}
