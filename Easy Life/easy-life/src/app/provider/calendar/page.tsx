"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface CalendarEntry {
  id: string;
  title: string;
  date: string;
  time: string;
}

/** Figma-aligned provider calendar — schedule from upcoming bookings. */
export default function ProviderCalendarPage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAvatarName(d.name ?? ""))
      .catch(() => {});

    fetch("/api/provider/bookings")
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.bookings ?? [])
          .filter((b: { status: string }) =>
            b.status === "upcoming" || b.status === "pending" || b.status === "accepted",
          )
          .map((b: { id: string; service: string; resident: string; date: string; time: string }) => ({
            id: b.id,
            title: `${b.service} — ${b.resident}`,
            date: b.date,
            time: b.time,
          }));
        setCalendar(entries);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Calendar")} avatarName={avatarName} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[21px] font-medium text-black">{t("Upcoming schedule")}</h2>
          <Link href="/provider/bookings" className="text-sm text-[var(--mvp-blue)]">
            {t("View bookings")}
          </Link>
        </div>

        <p className="mb-6 text-sm text-grey">
          {t(
            "Your schedule is built from upcoming bookings. Members request times when they book — you cannot add events here.",
          )}
        </p>

        <ul className="space-y-3">
          {calendar.length === 0 ? (
            <li className="rounded-xl border border-border-2 bg-white px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No upcoming bookings.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Create a booking or wait for member requests — they appear here.")}
              </p>
              <Link
                href="/provider/bookings"
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("View Bookings")}
              </Link>
            </li>
          ) : (
            calendar.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/provider/bookings/${e.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border-2 bg-white p-4 transition hover:border-[var(--mvp-blue)]/40"
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--mvp-blue)] text-white">
                    <span className="text-[10px] font-medium uppercase opacity-80">
                      {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-xl font-semibold">{new Date(e.date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-black">{e.title}</h3>
                    <p className="mt-0.5 text-sm text-grey">
                      {e.time} · {formatDate(e.date)}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </PageBody>
    </div>
  );
}
