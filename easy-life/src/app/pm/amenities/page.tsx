"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

type AmenityHours = {
  id: string;
  name: string;
  schedule: string;
};

const TIMES = [
  "05:00",
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

export default function PmAmenityHoursPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<AmenityHours[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { open: string; close: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetch("/api/pm/amenity-hours")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        const amenities = (d.amenities ?? []) as AmenityHours[];
        setRows(amenities);
        const next: Record<string, { open: string; close: string }> = {};
        for (const amenity of amenities) {
          next[amenity.id] = { open: "08:00", close: "20:00" };
        }
        setDrafts(next);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    const res = await fetch("/api/pm/amenity-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amenityId: id, open: draft.open, close: draft.close }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not save hours") });
      return;
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, schedule: data.amenity?.schedule ?? row.schedule } : row,
      ),
    );
    toast({ variant: "success", title: t("Hours updated") });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Amenity hours")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Set the daily open and close time for each amenity. Members see this on Hours and when they reserve.")}
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white p-4">
              <p className="text-[15px] font-semibold text-ink">{row.name}</p>
              <p className="mt-0.5 text-[12px] text-grey">{row.schedule || t("No hours posted")}</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-[12px] text-grey">
                  {t("Opens")}
                  <select
                    className="mt-1 block h-10 rounded-xl border border-[#e4e8ee] px-2 text-sm text-ink"
                    value={drafts[row.id]?.open ?? "08:00"}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { open: e.target.value, close: prev[row.id]?.close ?? "20:00" },
                      }))
                    }
                  >
                    {TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[12px] text-grey">
                  {t("Closes")}
                  <select
                    className="mt-1 block h-10 rounded-xl border border-[#e4e8ee] px-2 text-sm text-ink"
                    value={drafts[row.id]?.close ?? "20:00"}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { open: prev[row.id]?.open ?? "08:00", close: e.target.value },
                      }))
                    }
                  >
                    {TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void save(row.id)}
                  className="h-10 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                >
                  {t("Save")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
