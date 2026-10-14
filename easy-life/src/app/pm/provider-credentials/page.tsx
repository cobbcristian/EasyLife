"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { lapseStage } from "@/lib/credential-lapse";

type Row = {
  id: string;
  kind: string;
  fileName: string;
  url: string;
  providerName: string;
  providerCategory: string;
  createdAt: string;
  expiresOn?: string | null;
};

const LABELS: Record<string, string> = {
  background_check: "Background check",
  government_id: "Government ID",
  license: "License",
  insurance: "Insurance",
};

export default function ProviderCredentialsReviewPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetch("/api/admin/provider-credentials")
      .then((r) => r.json())
      .then((d) => {
        if (on) setRows(d.credentials ?? []);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Provider documents")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Background checks, IDs, licenses, and insurance uploaded by service providers. Licenses and insurance show here when they are close to lapsing, and the provider and staff are notified.")}
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-grey">{t("No documents uploaded yet.")}</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0] bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">{row.providerName}</p>
                <p className="text-[12px] text-grey">
                  {t(LABELS[row.kind] ?? row.kind)} · {row.fileName}
                  {row.providerCategory ? ` · ${row.providerCategory}` : ""}
                </p>
                {row.expiresOn ? (
                  <p
                    className={`mt-0.5 text-[12px] font-semibold ${
                      lapseStage(row.expiresOn) ? "text-[#b42318]" : "text-grey"
                    }`}
                  >
                    {lapseStage(row.expiresOn) === "lapsed"
                      ? t("Expired")
                      : t("Expires")}{" "}
                    {row.expiresOn}
                  </p>
                ) : row.kind === "license" || row.kind === "insurance" ? (
                  <p className="mt-0.5 text-[12px] font-semibold text-[#b54708]">
                    {t("No expiration date")}
                  </p>
                ) : null}
              </div>
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("View")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
