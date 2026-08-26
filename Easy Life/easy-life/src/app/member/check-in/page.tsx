"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const FACILITIES = [
  "Fitness Center",
  "Pool",
  "Tennis Pavilion",
  "Golf Starter",
  "Spa",
];

type CheckIn = {
  id: string;
  facility: string;
  method: string;
  checkedInAt: string;
};

export default function MemberCheckInPage() {
  const { t } = useI18n();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [facility, setFacility] = useState(FACILITIES[0]);

  function load() {
    fetch("/api/activity-checkin")
      .then((r) => r.json())
      .then((d) => setCheckIns(d.checkIns ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCheckIn(method: "app" | "beacon") {
    setCheckingIn(true);
    try {
      await fetch("/api/activity-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facility,
          method,
          beaconId:
            method === "beacon"
              ? `beacon-${facility.toLowerCase().replace(/\s+/g, "-")}-1`
              : undefined,
        }),
      });
      load();
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Check in")}</h1>
        <p className="mt-1 text-grey">
          {t("Track your visits to fitness, pool, and club facilities.")}
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-grey">
          {t("Facility")}
        </label>
        <select
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-3 text-sm"
        >
          {FACILITIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={checkingIn}
            onClick={() => handleCheckIn("app")}
            className="h-12 rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("Check in (app)")}
          </button>
          <button
            type="button"
            disabled={checkingIn}
            onClick={() => handleCheckIn("beacon")}
            className="h-12 rounded-xl border border-[var(--mvp-blue)] text-sm font-semibold text-[var(--mvp-blue)] disabled:opacity-60"
          >
            {t("Beacon nearby")}
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-ink">{t("Recent visits")}</h2>
        <ul className="mt-3 space-y-2">
          {checkIns.map((c) => (
            <li
              key={c.id}
              className="flex justify-between rounded-xl bg-[#fafbfc] px-3 py-2 text-sm"
            >
              <span>{c.facility}</span>
              <span className="text-grey">
                {new Date(c.checkedInAt).toLocaleDateString()}
              </span>
            </li>
          ))}
          {checkIns.length === 0 && (
            <li className="text-sm text-grey">{t("No check-ins yet.")}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
