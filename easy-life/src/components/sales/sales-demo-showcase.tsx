"use client";

import Link from "next/link";
import type { SalesClub } from "@/lib/sales-clubs";
import { WalletPayDemo } from "@/components/sales/wallet-pay-demo";

function Phone({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ flex: "0 0 390px", scrollSnapAlign: "start" }}>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
          opacity: 0.55,
        }}
      >
        {label}
      </p>
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
          border: "1px solid rgba(246,241,232,0.12)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Dock({ active }: { active: "today" | "book" | "inbox" | "account" }) {
  const items = [
    { id: "today" as const, label: "Today" },
    { id: "book" as const, label: "Book" },
    { id: "inbox" as const, label: "Inbox" },
    { id: "account" as const, label: "You" },
  ];
  return (
    <nav
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 4,
        padding: 6,
        borderRadius: 28,
        background: "var(--ink)",
      }}
    >
      {items.map((item) => {
        const on = item.id === active;
        return (
          <span
            key={item.id}
            style={{
              display: "grid",
              placeItems: "center",
              gap: 2,
              minHeight: 52,
              borderRadius: 20,
              background: on ? "var(--sand)" : "transparent",
              color: on ? "var(--ink)" : "#b0c7bf",
              fontSize: 10,
              fontWeight: on ? 700 : 500,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.id === "book" ? "+" : "●"}</span>
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}

function Shell({
  children,
  dock,
}: {
  children: React.ReactNode;
  dock?: "today" | "book" | "inbox" | "account";
}) {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        background: "var(--sand)",
        color: "var(--ink)",
        paddingBottom: dock ? 88 : 0,
      }}
    >
      {children}
      {dock ? <Dock active={dock} /> : null}
    </div>
  );
}

function InkHeader({
  eyebrow,
  title,
  lead,
  photo,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  photo?: boolean;
}) {
  return (
    <header style={{ background: "var(--ink)", color: "var(--sand)" }}>
      {photo ? (
        <div
          className="harbor-atmosphere"
          style={{
            height: 160,
            background:
              "linear-gradient(135deg, rgba(115,184,212,0.9) 0%, rgba(11,31,28,0.95) 100%)",
          }}
        />
      ) : null}
      <div style={{ padding: photo ? "16px 20px 22px" : "54px 20px 22px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.7,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            margin: "10px 0 0",
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        {lead ? (
          <p style={{ margin: "8px 0 0", opacity: 0.72, fontSize: 14, lineHeight: 1.45 }}>{lead}</p>
        ) : null}
      </div>
    </header>
  );
}

function Row({
  title,
  meta,
  accent,
}: {
  title: string;
  meta: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "14px 16px",
        borderRadius: 16,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        minHeight: 72,
      }}
    >
      <span
        aria-hidden
        style={{ width: 4, height: 44, borderRadius: 4, background: accent, flexShrink: 0 }}
      />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 650, fontSize: 15 }}>{title}</span>
        <span style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--mute)" }}>{meta}</span>
      </span>
      <span style={{ color: "var(--mute)", fontSize: 20 }}>›</span>
    </div>
  );
}

export function SalesDemoShowcase({ club }: { club: SalesClub }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        overflowX: "auto",
        padding: "32px 24px 40px",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Phone label="1 · /go login">
        <div style={{ height: "100%", display: "grid", gridTemplateRows: "1fr auto" }}>
          <div
            style={{
              background: club.heroGradient,
              padding: "24px 20px",
              display: "grid",
              alignContent: "end",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.2em", opacity: 0.75, fontWeight: 600 }}>
              {club.name.toUpperCase()}
            </p>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "1.65rem",
                fontWeight: 600,
                lineHeight: 1.15,
              }}
            >
              Your building, one tap away.
            </h2>
            <p style={{ margin: 0, opacity: 0.8, fontSize: 13, lineHeight: 1.45 }}>
              Book amenities, pay assessments, message the desk.
            </p>
          </div>
          <form
            style={{
              padding: 20,
              background: "var(--sand)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: club.accent,
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 600 }}>Easy Life</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--mute)" }}>Sign in to {club.name.split(" ")[0]}</p>
              </div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Email
              <input
                readOnly
                defaultValue={club.loginEmail}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: "14px",
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  background: "#fff",
                }}
              />
            </label>
            <button
              type="button"
              style={{
                border: 0,
                minHeight: 52,
                borderRadius: 999,
                background: "var(--signal)",
                color: "var(--signal-ink)",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Sign in
            </button>
          </form>
        </div>
      </Phone>

      <Phone label="2 · Today">
        <Shell dock="today">
          <InkHeader
            photo
            eyebrow={club.eyebrow}
            title={club.greeting}
            lead={club.subline}
          />
          <div style={{ padding: "20px 20px 0", display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[
                { label: "Book", bg: "var(--sea)" },
                { label: "Pay $420", bg: "var(--signal)" },
                { label: "Package", bg: "var(--ink)" },
              ].map((a) => (
                <div
                  key={a.label}
                  style={{
                    minHeight: 76,
                    borderRadius: 16,
                    background: a.bg,
                    color: "var(--sand)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {a.label}
                </div>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, letterSpacing: "0.14em", fontWeight: 700, color: "var(--mute)" }}>
              NEEDS YOU
            </p>
            <Row title="Theater · 12:00 today" meta="Confirmed" accent="var(--sea)" />
            <Row title="Locker B12" meta="Code 4481 ready" accent="var(--signal)" />
            <Row title="August assessment" meta="$420 due Aug 28" accent={club.accent} />
          </div>
        </Shell>
      </Phone>

      <Phone label="3 · Book">
        <Shell dock="book">
          <InkHeader eyebrow="THEATER" title="Pick a time" lead="AV ready · 24 seats" />
          <div style={{ padding: 20, display: "grid", gap: 10 }}>
            {[
              { t: "Today · 12:00–14:00", s: "selected" },
              { t: "Today · 5:30–7:30p", s: "held" },
              { t: "Tomorrow · 12:00–2:00p", s: "open" },
            ].map((slot) => (
              <div
                key={slot.t}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: slot.s === "selected" ? "var(--sea)" : "var(--surface)",
                  color: slot.s === "selected" ? "var(--sea-ink)" : "inherit",
                  border: slot.s === "open" ? "1px solid var(--line)" : "none",
                  opacity: slot.s === "held" ? 0.65 : 1,
                }}
              >
                <span style={{ fontWeight: 650 }}>{slot.t}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  {slot.s === "selected" ? "Selected" : slot.s === "held" ? "Held" : "Available"}
                </span>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                minHeight: 52,
                borderRadius: 14,
                background: "var(--ink)",
                color: "var(--sand)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              Confirm reservation
            </div>
          </div>
        </Shell>
      </Phone>

      <Phone label="4 · Pay">
        <Shell dock="today">
          <InkHeader eyebrow="MONEY" title="Balances" lead="Pay assessments and review receipts." />
          <div style={{ padding: 20 }}>
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: "var(--surface)",
                border: "1px solid rgba(26,74,66,0.25)",
                display: "grid",
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--signal)", letterSpacing: "0.1em" }}>
                DUE SOON
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "2.75rem",
                  fontWeight: 600,
                }}
              >
                $420.00
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mute)" }}>August assessment · due Aug 28</p>
              <WalletPayDemo compact />
              <div
                style={{
                  minHeight: 44,
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 650,
                  fontSize: 14,
                }}
              >
                Pay with card
              </div>
            </div>
          </div>
        </Shell>
      </Phone>

      <Phone label="5 · Package">
        <Shell dock="today">
          <InkHeader eyebrow="PACKAGES" title="Deliveries" lead="Pickup codes and locker status." />
          <div style={{ padding: 20 }}>
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: "var(--surface)",
                border: "1px solid rgba(26,74,66,0.35)",
                display: "grid",
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>Amazon · Locker B12</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mute)" }}>Show this code at the bay</p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--font-display)",
                  fontSize: "3rem",
                  fontWeight: 600,
                  color: "var(--sea)",
                  letterSpacing: "0.08em",
                }}
              >
                4481
              </p>
            </div>
          </div>
        </Shell>
      </Phone>

      <Phone label="6 · Assistant">
        <Shell dock="today">
          <InkHeader eyebrow="ASSISTANT" title="Ask Easy Life" lead="Say or type what you need." />
          <div style={{ padding: 20, display: "grid", gap: 16, justifyItems: "center" }}>
            <div
              style={{
                width: "100%",
                padding: 28,
                borderRadius: 20,
                background: "var(--surface)",
                border: "2px solid rgba(184,74,47,0.35)",
                textAlign: "center",
                display: "grid",
                gap: 12,
                justifyItems: "center",
              }}
            >
              <span className="harbor-listen" style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--signal)", display: "block" }} />
              <p style={{ margin: 0, fontWeight: 650 }}>Listening… speak now</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--mute)" }}>&quot;When does the pool close?&quot;</p>
            </div>
          </div>
        </Shell>
      </Phone>

      <Phone label="7 · Inbox">
        <Shell dock="inbox">
          <InkHeader eyebrow="INBOX" title="Messages" lead="Desk, vendors, and building notes." />
          <div style={{ padding: 20, display: "grid", gap: 10 }}>
            {[
              { t: "Front desk", m: "Guest pass ready for Saturday", n: true },
              { t: "Board notice", m: "August packet posted", n: true },
              { t: "Harbor HVAC", m: "Tomorrow 10:30a", n: false },
            ].map((row) => (
              <div
                key={row.t}
                style={{
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: "var(--surface)",
                  border: row.n ? "1px solid rgba(184,74,47,0.35)" : "1px solid var(--line)",
                }}
              >
                <p style={{ margin: 0, fontWeight: 650 }}>{row.t}</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--mute)" }}>{row.m}</p>
              </div>
            ))}
          </div>
        </Shell>
      </Phone>

      <Phone label="8 · Welcome">
        <div
          style={{
            height: "100%",
            padding: "80px 24px 40px",
            display: "grid",
            alignContent: "center",
            gap: 16,
            background: "var(--sand)",
          }}
        >
          <span
            className="harbor-breathe"
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(145deg, var(--sea), ${club.accent})`,
            }}
          />
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 600 }}>
            You&apos;re in
          </h2>
          <p style={{ margin: 0, color: "var(--mute)", lineHeight: 1.5 }}>
            Unit {club.unit} unlocks after the desk confirms.
          </p>
          <Link
            href="/today"
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: 52,
              borderRadius: 14,
              background: "var(--sea)",
              color: "var(--sea-ink)",
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            Go to Today
          </Link>
        </div>
      </Phone>
    </div>
  );
}
