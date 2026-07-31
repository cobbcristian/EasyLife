"use client";

import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface AccessLogRow {
  id: string;
  userName: string;
  action: string;
  detail: string;
  createdAt: string;
}

export function AccessLogsClient({ logs }: { logs: AccessLogRow[] }) {
  const { t } = useI18n();

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Access Logs" right="logo" />
      <PageBody>
        <p className="mb-6 text-sm text-grey">
          {t("Live activity — logins, bookings, requests, invoices, and account changes.")}
        </p>
        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 text-grey">
                  <th className="px-5 py-3 font-medium">{t("User")}</th>
                  <th className="px-5 py-3 font-medium">{t("Action")}</th>
                  <th className="px-5 py-3 font-medium">{t("Detail")}</th>
                  <th className="px-5 py-3 font-medium">{t("Date")}</th>
                  <th className="px-5 py-3 font-medium">{t("Time")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-ink">
                        {t("No activity recorded yet.")}
                      </p>
                      <p className="mt-1 text-sm text-grey">
                        {t("Sign-ins and admin actions will appear in this log.")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b border-border-2 last:border-0">
                      <td className="px-5 py-3 font-medium text-ink">{l.userName}</td>
                      <td className="px-5 py-3 text-gray-2">{t(l.action)}</td>
                      <td className="px-5 py-3 text-gray-2">{t(l.detail)}</td>
                      <td className="px-5 py-3 text-gray-2">
                        {formatDate(l.createdAt.slice(0, 10))}
                      </td>
                      <td className="px-5 py-3 text-gray-2">
                        {new Date(l.createdAt).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
