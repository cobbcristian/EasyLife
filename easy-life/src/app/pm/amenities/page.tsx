"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import type { WeeklyHours } from "@/lib/hours";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type AmenityRow = {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  hours: WeeklyHours | null;
};

type DayDraft = { closed: boolean; open: string; close: string };

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

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

function draftsFrom(hours: WeeklyHours | null): Record<DayKey, DayDraft> {
  const next = {} as Record<DayKey, DayDraft>;
  for (const day of DAYS) {
    const saved = hours?.[day.key];
    if (!hours) {
      next[day.key] = { closed: false, open: "08:00", close: "20:00" };
    } else if (saved) {
      next[day.key] = { closed: false, open: saved.open, close: saved.close };
    } else {
      next[day.key] = { closed: true, open: "08:00", close: "20:00" };
    }
  }
  return next;
}

function hoursPayload(draft: Record<DayKey, DayDraft>) {
  const hours = {} as WeeklyHours;
  for (const day of DAYS) {
    const row = draft[day.key];
    hours[day.key] = row.closed ? null : { open: row.open, close: row.close };
  }
  return hours;
}

export default function PmAmenitiesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<AmenityRow[]>([]);
  const [hours, setHours] = useState<Record<string, Record<DayKey, DayDraft>>>({});
  const [details, setDetails] = useState<Record<string, { name: string; description: string; fee: string }>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "", fee: "0", open: "08:00", close: "20:00" });

  function remember(amenities: AmenityRow[]) {
    setRows(amenities);
    const nextHours: Record<string, Record<DayKey, DayDraft>> = {};
    const nextDetails: Record<string, { name: string; description: string; fee: string }> = {};
    for (const amenity of amenities) {
      nextHours[amenity.id] = draftsFrom(amenity.hours);
      nextDetails[amenity.id] = {
        name: amenity.name,
        description: amenity.description,
        fee: String(amenity.fee),
      };
    }
    setHours(nextHours);
    setDetails(nextDetails);
  }

  useEffect(() => {
    let on = true;
    fetch("/api/pm/amenities")
      .then((r) => r.json())
      .then((data) => {
        if (on) remember((data.amenities ?? []) as AmenityRow[]);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function createAmenity() {
    const res = await fetch("/api/pm/amenities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not add amenity") });
      return;
    }
    remember([data.amenity as AmenityRow, ...rows]);
    setDraft({ name: "", description: "", fee: "0", open: "08:00", close: "20:00" });
    toast({ variant: "success", title: t("Amenity added") });
  }

  async function saveDetails(id: string) {
    const detail = details[id];
    if (!detail) return;
    const res = await fetch("/api/pm/amenities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: detail.name,
        description: detail.description,
        fee: Number(detail.fee),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not save amenity") });
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? (data.amenity as AmenityRow) : row)));
    toast({ variant: "success", title: t("Amenity updated") });
  }

  async function saveHours(id: string) {
    const draftHours = hours[id];
    if (!draftHours) return;
    const res = await fetch("/api/pm/amenities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hours: hoursPayload(draftHours) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not save hours") });
      return;
    }
    const amenity = data.amenity as AmenityRow;
    setRows((prev) => prev.map((row) => (row.id === id ? amenity : row)));
    setHours((prev) => ({ ...prev, [id]: draftsFrom(amenity.hours) }));
    toast({ variant: "success", title: t("Hours updated") });
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(t("Delete this amenity?") + " " + name)) return;
    const res = await fetch("/api/pm/amenities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not delete amenity") });
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    toast({ variant: "success", title: t("Amenity deleted") });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <h1 className="text-[22px] font-semibold text-ink">{t("Amenities")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Add, change, or remove amenities, and set which days they are open.")}
      </p>

      <form
        className="mt-5 space-y-3 rounded-2xl border border-[#e8ebf0] bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void createAmenity();
        }}
      >
        <p className="text-[15px] font-semibold text-ink">{t("Add amenity")}</p>
        <input
          required
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={t("Name")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          placeholder={t("Description")}
          className="min-h-20 w-full rounded-xl border border-[#e4e8ee] px-3 py-2 text-sm"
        />
        <label className="block text-[12px] text-grey">
          {t("Fee")}
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.fee}
            onChange={(e) => setDraft((prev) => ({ ...prev, fee: e.target.value }))}
            className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm text-ink"
          />
        </label>
        <div className="flex gap-2">
          <label className="flex-1 text-[12px] text-grey">
            {t("Opens")}
            <select
              value={draft.open}
              onChange={(e) => setDraft((prev) => ({ ...prev, open: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] px-2 text-sm text-ink"
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-[12px] text-grey">
            {t("Closes")}
            <select
              value={draft.close}
              onChange={(e) => setDraft((prev) => ({ ...prev, close: e.target.value }))}
              className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] px-2 text-sm text-ink"
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="h-11 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
          {t("Add amenity")}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => {
            const open = openId === row.id;
            const detail = details[row.id];
            const dayDraft = hours[row.id];
            return (
              <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{row.name}</p>
                    <p className="mt-0.5 text-[12px] text-grey">
                      {row.schedule || t("No hours posted")}
                      {row.fee > 0 ? ` · $${row.fee}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.id)}
                    className="rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[12px] font-semibold text-ink"
                  >
                    {open ? t("Close") : t("Change")}
                  </button>
                </div>
                {open && detail && dayDraft ? (
                  <div className="mt-4 space-y-3">
                    <input
                      value={detail.name}
                      onChange={(e) =>
                        setDetails((prev) => ({
                          ...prev,
                          [row.id]: { ...detail, name: e.target.value },
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
                    />
                    <textarea
                      value={detail.description}
                      onChange={(e) =>
                        setDetails((prev) => ({
                          ...prev,
                          [row.id]: { ...detail, description: e.target.value },
                        }))
                      }
                      className="min-h-20 w-full rounded-xl border border-[#e4e8ee] px-3 py-2 text-sm"
                    />
                    <label className="block text-[12px] text-grey">
                      {t("Fee")}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={detail.fee}
                        onChange={(e) =>
                          setDetails((prev) => ({
                            ...prev,
                            [row.id]: { ...detail, fee: e.target.value },
                          }))
                        }
                        className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm text-ink"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveDetails(row.id)}
                      className="h-10 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Save amenity")}
                    </button>
                    <p className="pt-2 text-[13px] font-semibold text-ink">{t("Hours of operation")}</p>
                    <ul className="space-y-2">
                      {DAYS.map((day) => {
                        const value = dayDraft[day.key];
                        return (
                          <li key={day.key} className="flex flex-wrap items-center gap-2">
                            <span className="w-24 text-[12px] text-grey">{t(day.label)}</span>
                            <label className="flex items-center gap-1 text-[12px] text-ink">
                              <input
                                type="checkbox"
                                checked={value.closed}
                                onChange={(e) =>
                                  setHours((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...dayDraft,
                                      [day.key]: { ...value, closed: e.target.checked },
                                    },
                                  }))
                                }
                              />
                              {t("Closed")}
                            </label>
                            {value.closed ? null : (
                              <>
                                <select
                                  value={value.open}
                                  onChange={(e) =>
                                    setHours((prev) => ({
                                      ...prev,
                                      [row.id]: {
                                        ...dayDraft,
                                        [day.key]: { ...value, open: e.target.value },
                                      },
                                    }))
                                  }
                                  className="h-9 rounded-lg border border-[#e4e8ee] px-2 text-sm"
                                >
                                  {TIMES.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={value.close}
                                  onChange={(e) =>
                                    setHours((prev) => ({
                                      ...prev,
                                      [row.id]: {
                                        ...dayDraft,
                                        [day.key]: { ...value, close: e.target.value },
                                      },
                                    }))
                                  }
                                  className="h-9 rounded-lg border border-[#e4e8ee] px-2 text-sm"
                                >
                                  {TIMES.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveHours(row.id)}
                        className="h-10 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                      >
                        {t("Save hours")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row.id, row.name)}
                        className="h-10 rounded-xl border border-[#e4e8ee] px-4 text-sm font-semibold text-ink"
                      >
                        {t("Delete amenity")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
