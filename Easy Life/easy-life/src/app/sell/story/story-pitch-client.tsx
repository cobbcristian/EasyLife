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

type Role = "Narrator" | "Resident" | "Provider" | "PM" | "Board";

type Slide = {
  id: string;
  role: Role;
  chapter?: string;
  render: () => ReactNode;
};

const DIRECTORY_HREF = "/go";
const DEMO_HREF = "/go/oceansideresidents";
const LOGO_ICON = "/brand/logo-icon.png";

const ROLE_COLOR: Record<Role, string> = {
  Narrator: "var(--el-signal-soft)",
  Resident: "#9ec5ff",
  Provider: "var(--el-ember)",
  PM: "#f0c674",
  Board: "#d4b5ff",
};

export function StoryPitchClient() {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const slides = buildSlides();
  const last = slides.length - 1;
  const current = slides[index]!;

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
      style={{ fontFamily: "var(--font-story-sans), system-ui, sans-serif" }}
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
            radial-gradient(ellipse 70% 50% at 90% 0%, rgba(10,132,255,0.22), transparent 55%),
            radial-gradient(ellipse 50% 40% at 10% 100%, rgba(125,211,192,0.08), transparent 50%),
            linear-gradient(165deg, var(--el-void) 0%, var(--el-slate) 50%, var(--el-steel) 100%)
          `,
        }}
      />

      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={LOGO_ICON}
            alt=""
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
              Easy Life · Product story
            </p>
            <p
              className="el-story-role mt-0.5 truncate text-[10px] font-semibold uppercase"
              style={{ color: ROLE_COLOR[current.role] }}
            >
              {current.role}
              {current.chapter ? ` · ${current.chapter}` : ""}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-white/40">
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
                "absolute inset-x-5 top-20 bottom-24 flex items-center justify-center sm:inset-x-10",
                reducedMotion
                  ? active
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                  : active
                    ? "translate-y-0 opacity-100 transition-all duration-500 ease-out"
                    : "pointer-events-none translate-y-3 opacity-0 transition-all duration-500 ease-out",
              )}
            >
              {slide.render()}
            </div>
          );
        })}
      </div>

      <footer className="relative z-20 flex flex-col items-center gap-3 px-5 pb-6">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.role}`}
              aria-current={i === index}
              title={s.role}
              onClick={(e) => {
                e.stopPropagation();
                go(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-7" : "w-1.5 bg-white/20 hover:bg-white/40",
              )}
              style={
                i === index
                  ? { backgroundColor: ROLE_COLOR[s.role] }
                  : undefined
              }
            />
          ))}
        </div>
      </footer>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left",
          !reducedMotion && "transition-transform duration-500 ease-out",
        )}
        style={{
          backgroundColor: ROLE_COLOR[current.role],
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
        "text-balance font-medium leading-[1.08] tracking-[-0.02em] text-white",
        className,
      )}
      style={{ fontFamily: "var(--font-story-display), Georgia, serif" }}
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

function Beat({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 max-w-lg border-l border-white/20 pl-4 text-sm font-medium leading-relaxed text-white/80 sm:text-base">
      {children}
    </p>
  );
}

function buildSlides(): Slide[] {
  return [
    {
      id: "open",
      role: "Narrator",
      chapter: "Prologue",
      render: () => (
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src={LOGO_ICON}
            alt="Easy Life"
            className="h-16 w-16 rounded-2xl object-cover shadow-lg shadow-[var(--el-signal)]/25"
          />
          <Display className="mt-8 text-4xl sm:text-6xl md:text-7xl">
            One community.
            <br />
            Four lives.
            <br />
            One story.
          </Display>
          <Soft className="mx-auto mt-6">
            Follow a resident booking a court, a provider winning the job, a PM
            clearing the door, and a board seeing it all — without leaving Easy
            Life.
          </Soft>
        </div>
      ),
    },
    {
      id: "maya-morning",
      role: "Resident",
      chapter: "Saturday morning",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Maya opens Easy Life instead of Facebook.
          </Display>
          <Soft className="mt-6">
            She’s not hunting for a group post. She’s home — her community’s
            home screen, crest and all.
          </Soft>
          <Beat>Member home: upcoming life, not noise.</Beat>
        </div>
      ),
    },
    {
      id: "book",
      role: "Resident",
      chapter: "Amenities",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            She books the golf simulator for 10.
          </Display>
          <Soft className="mt-6">
            Real inventory — courts, theater, grills, board room — with times
            that don’t double-book.
          </Soft>
          <Beat>Amenities · Bookings · Capacity that holds.</Beat>
        </div>
      ),
    },
    {
      id: "calendar",
      role: "Resident",
      chapter: "Calendar",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            It lands on her calendar. Automatically.
          </Display>
          <Soft className="mt-6">
            She sees what’s hers, what she can cancel, and facility hours when
            she wants a walk-in instead of a reservation.
          </Soft>
          <Beat>My Calendar · Hours · grace rules without a binder.</Beat>
        </div>
      ),
    },
    {
      id: "message",
      role: "Resident",
      chapter: "Messages",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            “Can the front desk expect my brother at noon?”
          </Display>
          <Soft className="mt-6">
            She messages management — not a group chat that disappears. The
            thread lives where staff already work.
          </Soft>
          <Beat>Messages straight to PM, board, social, admin.</Beat>
        </div>
      ),
    },
    {
      id: "assistant",
      role: "Resident",
      chapter: "Assistant",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            She asks the assistant for a shortcut.
          </Display>
          <Soft className="mt-6">
            Book another amenity. Jump to dues. Easy Life helps without sending
            her to another app.
          </Soft>
          <Beat>In-app assistant for the moments people usually call down.</Beat>
        </div>
      ),
    },
    {
      id: "guest",
      role: "Resident",
      chapter: "Visitors",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Her brother is pre-registered before he arrives.
          </Display>
          <Soft className="mt-6">
            No surprise at the desk. Guest expected — name, time, reason —
            waiting for staff.
          </Soft>
          <Beat>Visitors → front desk sees “expected,” not “who?”</Beat>
        </div>
      ),
    },
    {
      id: "pros",
      role: "Resident",
      chapter: "Local Pros",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            The carpet needs work. She doesn’t Google strangers.
          </Display>
          <Soft className="mt-6">
            Local Pros inside the community — flooring, cleaning, handymen —
            people who already serve these doors.
          </Soft>
          <Beat>Marketplace with community trust, not random ads.</Beat>
        </div>
      ),
    },
    {
      id: "dues",
      role: "Resident",
      chapter: "Payments",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Dues when they’re due — without a scavenger hunt.
          </Display>
          <Soft className="mt-6">
            HOA assessment path sits next to amenity charges and account
            history. One payments home.
          </Soft>
          <Beat>Payments · statements · portal handoff when the association needs it.</Beat>
        </div>
      ),
    },
    {
      id: "provider",
      role: "Provider",
      chapter: "Same afternoon",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Isaac sees the request on his provider desk.
          </Display>
          <Soft className="mt-6">
            Not a voicemail. A job in Easy Life — bookings, chats with
            residents, services he offers this community.
          </Soft>
          <Beat>Provider portal · bookings · messages · transactions.</Beat>
        </div>
      ),
    },
    {
      id: "pm-desk",
      role: "PM",
      chapter: "Front desk",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Noon: Maya’s brother walks in. The desk already knows.
          </Display>
          <Soft className="mt-6">
            Front desk admits the guest. Packages, maintenance, amenity demand —
            today’s ops in one place.
          </Soft>
          <Beat>PM home · front desk · bookings · packages · maintenance.</Beat>
        </div>
      ),
    },
    {
      id: "pm-approvals",
      role: "PM",
      chapter: "Access",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            A new resident applied last night. Staff decides.
          </Display>
          <Soft className="mt-6">
            Approvals, announcements, events — property managers control who
            belongs and what gets broadcast.
          </Soft>
          <Beat>Member approvals · announcements · reports for the board.</Beat>
        </div>
      ),
    },
    {
      id: "board",
      role: "Board",
      chapter: "Monday",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            The board opens Easy Life before the meeting.
          </Display>
          <Soft className="mt-6">
            Upcoming meetings. Open surveys. Budget and reserve snapshot —
            without asking for “the latest spreadsheet.”
          </Soft>
          <Beat>Board hub · scheduler · governance · budget · invoices.</Beat>
        </div>
      ),
    },
    {
      id: "board-reach",
      role: "Board",
      chapter: "Governance",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            They vote. They announce. They message PM.
          </Display>
          <Soft className="mt-6">
            Decisions and residency reach live in the same system that Maya used
            on Saturday — one thread of community truth.
          </Soft>
          <Beat>Votes · announcements · board messages · member approvals.</Beat>
        </div>
      ),
    },
    {
      id: "throughline",
      role: "Narrator",
      chapter: "The point",
      render: () => (
        <div className="mx-auto max-w-3xl">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Four roles. Zero handoff to Facebook.
          </Display>
          <Soft className="mt-6">
            Resident life creates work for providers and ops. Ops feeds the
            board. Easy Life is the spine — white-glove branded app optional,
            shared login with club switcher when two communities share a member.
          </Soft>
        </div>
      ),
    },
    {
      id: "cta",
      role: "Narrator",
      chapter: "Next",
      render: () => (
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Display className="text-4xl sm:text-5xl md:text-6xl">
            Walk the story live.
          </Display>
          <Soft className="mx-auto mt-6">
            Open a community demo and play each role — or start with Oceanside
            as the live proof.
          </Soft>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={DEMO_HREF}
              className="inline-flex items-center rounded-full bg-[var(--el-signal)] px-7 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              onClick={(e) => e.stopPropagation()}
            >
              Oceanside live demo
            </Link>
            <Link
              href={DIRECTORY_HREF}
              className="inline-flex items-center rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white/90 transition hover:border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              All club demos
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/70 transition hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              Platform pitch
            </Link>
          </div>
          <p className="mt-8 text-xs tracking-wide text-white/35">
            ← → or Space · colored dots follow the role
          </p>
        </div>
      ),
    },
  ];
}
