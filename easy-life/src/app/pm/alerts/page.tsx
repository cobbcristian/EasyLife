"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

const PRESETS = [
  "Tennis courts are closed",
  "Golf course is closed",
  "Pool is closed",
  "Gym is closed",
  "Clubhouse is closed",
];

interface AlertRow {
  id: string;
  message: string;
  detail: string;
}

export default function PmAlertsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/pm/alerts");
    if (!res.ok) return;
    const data = (await res.json()) as { alerts?: AlertRow[] };
    setAlerts(data.alerts ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function send() {
    setSaving(true);
    const res = await fetch("/api/pm/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, detail }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast({ variant: "warning", title: data?.error ?? t("Could not send alert") });
      return;
    }
    setMessage("");
    setDetail("");
    toast({ variant: "success", title: t("Alert sent to the community") });
    await load();
  }

  async function clear(id: string) {
    const res = await fetch("/api/pm/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not clear alert") });
      return;
    }
    setAlerts((rows) => rows.filter((row) => row.id !== id));
    toast({ variant: "success", title: t("Alert cleared") });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Community alerts")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Residents see this at the top of the app until you clear it. Use it when a court, course, or other place is closed.")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMessage(preset)}
            className="rounded-full border border-[#e8ebf0] bg-white px-3 py-1.5 text-xs font-semibold text-ink"
          >
            {t(preset)}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="alert-message">
        {t("Alert")}
      </label>
      <input
        id="alert-message"
        value={message}
        maxLength={160}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("Tennis courts are closed")}
        className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-3 text-sm"
      />
      <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="alert-detail">
        {t("Detail, optional")}
      </label>
      <input
        id="alert-detail"
        value={detail}
        maxLength={300}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={t("Closed for rain until 3pm")}
        className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-3 text-sm"
      />
      <button
        type="button"
        disabled={saving || message.trim().length < 4}
        onClick={() => void send()}
        className="mt-4 h-11 w-full rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? t("Sending…") : t("Send alert")}
      </button>

      <h2 className="mt-8 text-base font-semibold text-ink">{t("Showing now")}</h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-sm text-grey">{t("No alert is up.")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{alert.message}</p>
                {alert.detail ? (
                  <p className="mt-1 text-xs text-grey">{alert.detail}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void clear(alert.id)}
                className="shrink-0 text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("Clear")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
