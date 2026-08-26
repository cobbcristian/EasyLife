"use client";

import { useEffect, useState } from "react";
import { HarborPageHeader } from "@/components/harbor/harbor-page-header";

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
          beaconId: method === "beacon" ? `beacon-${facility.toLowerCase().replace(/\s+/g, "-")}-1` : undefined,
        }),
      });
      load();
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      <HarborPageHeader
        eyebrow="Member"
        title="Check in"
        lead="Track your visits to fitness, pool, and club facilities."
      />
      <div className="mx-auto max-w-lg px-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-grey">
          Facility
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
            className="h-12 rounded-xl bg-[var(--harbor-ink,#1a2332)] text-sm font-semibold text-white disabled:opacity-60"
          >
            Check in (app)
          </button>
          <button
            type="button"
            disabled={checkingIn}
            onClick={() => handleCheckIn("beacon")}
            className="h-12 rounded-xl border border-[var(--harbor-ink,#1a2332)] text-sm font-semibold text-[var(--harbor-ink,#1a2332)] disabled:opacity-60"
          >
            Beacon nearby
          </button>
        </div>
        <h2 className="mt-8 text-sm font-semibold text-ink">Recent visits</h2>
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
            <li className="text-sm text-grey">No check-ins yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
