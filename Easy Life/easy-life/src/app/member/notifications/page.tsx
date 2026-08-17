"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function redirectExternally(url: string) {
  window.location.assign(url);
}

interface MemberNotification {
  id: string;
  title: string;
  body: string;
  href?: string | null;
  createdAt: string;
}

interface MemberInvite {
  id: string;
  type: "event" | "booking";
  eventId?: string;
  bookingId?: string | null;
  title: string;
  date: string;
  time: string | null;
  location: string;
  hostName?: string;
  requirePayment: boolean;
  feeCents: number;
  inviteCapacity?: number | null;
  spotsLeft?: number | null;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Figma Notifications — inbox + Accept/Decline for pending invites. */
export default function MemberNotificationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<MemberNotification[]>([]);
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    let on = true;
    Promise.all([
      fetch("/api/member/notifications").then((r) => r.json()),
      fetch("/api/member/invites").then((r) => r.json()),
    ])
      .then(([notes, inv]) => {
        if (!on) return;
        setItems(notes.notifications ?? []);
        setInvites(inv.invites ?? []);
        // Clear unread badge on the home bell after opening this screen.
        void fetch("/api/member/notifications", { method: "PATCH" });
      })
      .catch(() => {
        if (!on) return;
        setItems([]);
        setInvites([]);
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  async function summarizeInbox() {
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await fetch("/api/ai/inbox/summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not summarize");
      setSummary(data.summary ?? "");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not summarize");
    } finally {
      setSummarizing(false);
    }
  }

  async function respondInvite(invite: MemberInvite, status: "accepted" | "declined") {
    setBusyId(invite.id);
    setMessage(null);
    try {
      if (invite.type === "booking") {
        const res = await fetch(`/api/booking-invites/${invite.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not update invite");
        }
        setMessage(status === "accepted" ? "You’re in — see you there." : "Invite declined.");
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        return;
      }
      if (!invite.eventId) throw new Error("Missing event");
      if (status === "declined") {
        const res = await fetch(`/api/events/${invite.eventId}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decline: true }),
        });
        if (!res.ok) throw new Error("Could not decline");
        setMessage("Marked not going.");
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        return;
      }

      // Probe RSVP — server computes member vs guest (2×) fee and capacity.
      const probe = await fetch(`/api/events/${invite.eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptInvite: true }),
      });
      const probeData = await probe.json().catch(() => ({}));
      if (probe.status === 409 || probeData.full) {
        throw new Error(probeData.error ?? "This clinic is full.");
      }
      if (probeData.needsPayment && probeData.amount) {
        if (probeData.payUrl) {
          redirectExternally(probeData.payUrl);
          return;
        }
        const checkout = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: probeData.amount,
            description: probeData.description ?? `Clinic: ${invite.title}`,
            chargeId: probeData.chargeId,
            returnPath: "/member/notifications",
          }),
        });
        const data = await checkout.json().catch(() => ({}));
        if (!checkout.ok) throw new Error(data.error ?? "Payment failed");
        if (data.url) {
          redirectExternally(data.url);
          return;
        }
        // Settlement marks the charge paid and RSVPs; acceptInvite re-confirms.
        await fetch(`/api/events/${invite.eventId}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acceptInvite: true }),
        });
        setMessage("Paid — you’re going!");
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        return;
      }
      if (!probe.ok && !probeData.ok) {
        throw new Error(probeData.error ?? "Could not accept");
      }
      setMessage("You’re going!");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not respond");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <div className="mx-auto w-full max-w-lg">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/member"
            className="flex h-10 w-10 items-center justify-center text-[var(--mvp-blue)]"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
          </Link>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-black">
            {t("Notifications")}
          </h1>
          <button
            type="button"
            onClick={() => void summarizeInbox()}
            disabled={summarizing}
            className="w-auto shrink-0 text-[11px] font-semibold text-[var(--mvp-blue)] disabled:opacity-50"
          >
            {summarizing ? t("…") : t("Summarize")}
          </button>
        </header>

        {summary ? (
          <p className="mx-4 mt-3 rounded-xl bg-[#f0f5ff] px-3 py-2 text-sm text-ink">{summary}</p>
        ) : null}

        {message ? (
          <p className="px-4 pt-3 text-sm font-medium text-[var(--mvp-blue)]">{message}</p>
        ) : null}

        {loading ? (
          <p className="px-4 py-8 text-sm text-grey">{t("Loading…")}</p>
        ) : (
          <>
            <section className="border-b border-[#eceff3] px-4 py-4">
              <h2 className="text-[15px] font-semibold text-black">{t("Invitations")}</h2>
              {invites.length === 0 ? (
                <div className="mt-3 rounded-xl bg-[#f7f8fa] p-4">
                  <p className="text-sm font-medium text-black">{t("No pending invitations")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("When neighbors invite you, Accept shows up here.")}
                  </p>
                  <Link
                    href="/member/calendar"
                    className="mt-3 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
                  >
                    {t("See calendar")} →
                  </Link>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {invites.map((inv) => {
                    const pay =
                      inv.type === "event" &&
                      inv.requirePayment &&
                      inv.feeCents > 0;
                    return (
                      <li
                        key={inv.id}
                        className="rounded-xl border border-[#eceff3] p-4"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-grey">
                          {inv.type === "booking"
                            ? t("Activity booking")
                            : t("Event")}
                        </p>
                        <p className="mt-1 text-[15px] font-semibold text-black">
                          {inv.hostName
                            ? `${inv.hostName} invited you to ${inv.title}`
                            : inv.title}
                        </p>
                        <p className="mt-1 text-sm text-grey">
                          {inv.date}
                          {inv.time ? ` · ${inv.time}` : ""}
                          {inv.location ? ` · ${inv.location}` : ""}
                        </p>
                        {inv.type === "booking" && inv.bookingId ? (
                          <Link
                            href={`/member/reservations/${inv.bookingId}`}
                            className="mt-2 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
                          >
                            {t("View reservation")} →
                          </Link>
                        ) : null}
                        {inv.type === "event" && inv.eventId ? (
                          <Link
                            href={`/member/events/${inv.eventId}`}
                            className="mt-2 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
                          >
                            {t("View event")} →
                          </Link>
                        ) : null}
                        {inv.type === "booking" && inv.inviteCapacity != null ? (
                          <p className="mt-1 text-sm font-medium text-[var(--mvp-blue)]">
                            {inv.spotsLeft === 0
                              ? t("Party is full")
                              : `${inv.spotsLeft ?? inv.inviteCapacity} ${t("of")} ${inv.inviteCapacity} ${t("spots left")}`}
                          </p>
                        ) : null}
                        {pay ? (
                          <p className="mt-1 text-sm font-semibold text-amber-600">
                            {t("Fee")} ${(inv.feeCents / 100).toFixed(2)}
                          </p>
                        ) : null}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => respondInvite(inv, "accepted")}
                            className="h-10 flex-1 rounded-lg bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {pay ? t("Pay & Going") : t("Going")}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => respondInvite(inv, "declined")}
                            className="h-10 flex-1 rounded-lg border border-[#eceff3] text-sm font-semibold text-black disabled:opacity-60"
                          >
                            {t("Not going")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="px-4 py-4">
              <h2 className="text-[15px] font-semibold text-black">{t("Inbox")}</h2>
              {items.length === 0 ? (
                <div className="mt-3 rounded-xl bg-[#f7f8fa] p-4">
                  <p className="text-sm font-medium text-black">
                    {t("No notifications yet.")}
                  </p>
                  <Link
                    href="/member/bookings"
                    className="mt-3 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
                  >
                    {t("Book a court")} →
                  </Link>
                </div>
              ) : (
                <ul className="mt-1 divide-y divide-[#eceff3]">
                  {items.map((n) => {
                    const content = (
                      <li className="flex gap-3 py-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[var(--mvp-blue)]">
                          <Bell className="h-5 w-5" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[15px] font-semibold text-black">
                              {t(n.title)}
                            </p>
                            <span className="shrink-0 text-[12px] text-grey">
                              {relativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[14px] leading-snug text-black">
                            {n.body}
                          </p>
                        </div>
                      </li>
                    );
                    return n.href ? (
                      <Link
                        key={n.id}
                        href={n.href}
                        className="block hover:bg-[#fafafa]"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={n.id}>{content}</div>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
