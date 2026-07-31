"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { SendTestNotification } from "@/components/notifications/send-test";
import { SendTestPush } from "@/components/notifications/send-test-push";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface NotificationDTO {
  id: string;
  title: string;
  detail: string;
  date: string;
  read: boolean;
}

export function NotificationsClient({ notifications }: { notifications: NotificationDTO[] }) {
  const { t } = useI18n();
  const [pushConfigured, setPushConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/push/subscribe")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setPushConfigured(Boolean(d.configured)))
      .catch(() => {});
  }, []);

  const deliveryChannels = [
    [t("Email notifications"), true],
    [t("SMS / text alerts"), true],
    [t("Push notifications"), pushConfigured],
    [t("Event reminders (3h before)"), true],
  ] as const;

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Notifications")} right="logo" />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-medium text-black">{t("Recent activity")}</h2>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-grey">{t("No results")}</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-lg border border-border-2 p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="text-sm text-grey">{n.detail}</p>
                      <p className="mt-1 text-xs text-grey-light">{formatDate(n.date)}</p>
                    </div>
                    {!n.read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--mvp-blue)]" />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 text-base font-medium text-black">{t("Delivery channels")}</h2>
            <div className="space-y-3 text-sm">
              {deliveryChannels.map(([label, on]) => (
                <label key={label} className="flex items-center justify-between">
                  <span className="text-gray-2">{label}</span>
                  <input type="checkbox" defaultChecked={on} />
                </label>
              ))}
              <div className="border-t border-border-2 pt-4">
                <SendTestNotification />
              </div>
              {pushConfigured ? (
                <div className="border-t border-border-2 pt-4">
                  <SendTestPush />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
