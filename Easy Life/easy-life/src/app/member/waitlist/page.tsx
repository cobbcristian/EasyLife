"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HarborPageHeader } from "@/components/harbor/harbor-page-header";

type WaitlistEntry = {
  id: string;
  amenity: string;
  restaurant: string | null;
  date: string;
  startTime: string;
  status: string;
  position: number;
};

export default function MemberWaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/booking-waitlist")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    await fetch(`/api/booking-waitlist?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      <HarborPageHeader
        eyebrow="Member"
        title="Waitlist"
        lead="We'll notify you when a slot opens."
      />
      <div className="mx-auto max-w-lg px-4">
        {loading ? (
          <p className="text-sm text-grey">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-6 text-center">
            <p className="text-sm font-semibold text-ink">No active waitlist entries</p>
            <Link
              href="/member/bookings"
              className="mt-3 inline-flex text-sm font-semibold text-[var(--harbor-signal,#2d6cdf)]"
            >
              Book an amenity →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {e.restaurant ?? e.amenity}
                    </p>
                    <p className="mt-1 text-sm text-grey">
                      {e.date} · {e.startTime}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--harbor-signal,#2d6cdf)]">
                      Position #{e.position} · {e.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancel(e.id)}
                    className="text-xs font-semibold text-[#c45c5c]"
                  >
                    Leave
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-grey">
          When a tee time or dining slot opens, you'll get a push notification to book
          before the next member in line.
        </p>
      </div>
    </div>
  );
}
