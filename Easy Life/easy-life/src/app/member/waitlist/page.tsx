"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Waitlist")}</h1>
        <p className="mt-1 text-grey">{t("We'll notify you when a slot opens.")}</p>
      </div>
      {loading ? (
        <p className="text-sm text-grey">{t("Loading…")}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-6 text-center">
          <p className="text-sm font-semibold text-ink">{t("No active waitlist entries")}</p>
          <Link
            href="/member/bookings"
            className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
          >
            {t("Book an amenity")} →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{e.restaurant ?? e.amenity}</p>
                  <p className="mt-1 text-sm text-grey">
                    {e.date} · {e.startTime}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--mvp-blue)]">
                    {t("Position")} #{e.position} · {e.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cancel(e.id)}
                  className="text-xs font-semibold text-[#c45c5c]"
                >
                  {t("Leave")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-grey">
        {t(
          "When a tee time or dining slot opens, you'll get a push notification to book before the next member in line.",
        )}
      </p>
    </div>
  );
}
