"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface AlertRow {
  id: string;
  message: string;
  detail: string;
}

export function CommunityAlertBanner({ flushTop = false }: { flushTop?: boolean }) {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  useEffect(() => {
    let on = true;
    async function load() {
      try {
        const res = await fetch("/api/member/alerts");
        if (!res.ok) return;
        const data = (await res.json()) as { alerts?: AlertRow[] };
        if (on) setAlerts(data.alerts ?? []);
      } catch {
        /* keep the last banner */
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div
      className={
        flushTop
          ? "bg-amber-700 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white"
          : "bg-amber-700 px-4 py-3 text-white"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-100">
        {t("Community alert")}
      </p>
      <ul className="mt-1 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <p className="text-sm font-semibold">{alert.message}</p>
            {alert.detail ? (
              <p className="text-xs text-amber-100">{alert.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
