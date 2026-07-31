"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { parseWeeklyHours, type WeeklyHours } from "@/lib/hours";

type Venue = {
  id: string;
  name: string;
  kind: string;
  schedule: string;
  hoursJson: string;
  description: string;
};

const KIND_GROUPS: Array<{ id: string; label: string; kinds: string[] }> = [
  { id: "dining", label: "Restaurants", kinds: ["restaurant", "dining"] },
  { id: "stores", label: "Stores", kinds: ["store", "pro_shop"] },
  { id: "tennis", label: "Tennis", kinds: ["court"] },
  { id: "pickleball", label: "Pickleball", kinds: ["pickleball"] },
  { id: "golf", label: "Golf", kinds: ["golf_course", "driving_range"] },
  { id: "spa", label: "Spa", kinds: ["spa"] },
  { id: "club", label: "Club amenities", kinds: ["clubhouse", "gym", "facility", "pool"] },
  { id: "fitness", label: "Fitness classes", kinds: ["fitness_class"] },
];

function dayLine(hours: WeeklyHours | null, schedule: string): string {
  if (!hours) return schedule || "Hours not posted";
  // Collapse identical open/close across the week into "Daily …".
  const days: Array<keyof WeeklyHours> = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const windows = days.map((k) => hours[k]);
  const first = windows[0];
  const allSame = windows.every(
    (d) =>
      (d == null && first == null) ||
      (d != null &&
        first != null &&
        d.open === first.open &&
        d.close === first.close &&
        JSON.stringify(d.closed ?? []) === JSON.stringify(first.closed ?? [])),
  );
  if (allSame && first) {
    const closedNote =
      first.closed?.length && first.closed[0].reason
        ? ` · ${first.closed[0].start}–${first.closed[0].end} ${first.closed[0].reason}`
        : first.closed?.length
          ? ` · closed ${first.closed[0].start}–${first.closed[0].end}`
          : "";
    return `Daily ${first.open}–${first.close}${closedNote}`;
  }
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  return days
    .map((k, i) => {
      const d = hours[k];
      return d ? `${labels[i]} ${d.open}–${d.close}` : `${labels[i]} Closed`;
    })
    .join(" · ");
}

export function MemberHoursClient() {
  const { t } = useI18n();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/directory?type=hours")
      .then((r) => r.json())
      .then((d) => setVenues(d.venues ?? []))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    return KIND_GROUPS.map((g) => ({
      ...g,
      items: venues.filter((v) => {
        const isPickle = /pickle/i.test(v.name);
        const isBocce = /bocce/i.test(v.name);
        if (g.id === "pickleball") return isPickle;
        if (g.id === "tennis") return g.kinds.includes(v.kind) && !isPickle && !isBocce;
        if (g.id === "club") return (g.kinds.includes(v.kind) && !isPickle) || isBocce;
        return g.kinds.includes(v.kind) && !isPickle;
      }),
    })).filter((g) => g.items.length > 0);
  }, [venues]);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          {t("Member")}
        </p>
        <h1 className="text-[22px] font-semibold">{t("Hours of operation")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t("Restaurants, shops, courts, spa, and clubhouse schedules.")}
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
        ) : groups.length === 0 ? (
          <div className="mt-6 rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
            <p className="text-sm font-semibold text-ink">{t("No hours posted yet.")}</p>
            <p className="mt-1 text-sm text-grey">
              {t("Ask the club to publish venue schedules, or book amenities now.")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a
                href="/member/bookings"
                className="inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Book")}
              </a>
              <a
                href="/member/contact"
                className="inline-flex h-10 items-center rounded-lg border border-[#e8ebf0] bg-white px-4 text-sm font-semibold text-ink"
              >
                {t("Contact")}
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map((g) => (
              <section key={g.id}>
                <h2 className="text-[15px] font-semibold text-ink">{t(g.label)}</h2>
                <ul className="mt-2 divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
                  {g.items.map((v) => {
                    const hours = parseWeeklyHours(v.hoursJson);
                    return (
                      <li key={v.id} className="px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{v.name}</p>
                        <p className="mt-0.5 text-xs text-grey">
                          {dayLine(hours, v.schedule)}
                        </p>
                        {v.kind === "spa" ? (
                          <a
                            href="/member/bookings"
                            className="mt-1 inline-block text-xs font-semibold text-[var(--mvp-blue)]"
                          >
                            {t("Reserve spa")} →
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
