"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

const KINDS = [
  { id: "background_check", label: "Background check" },
  { id: "government_id", label: "Government ID" },
  { id: "license", label: "License" },
  { id: "insurance", label: "Insurance" },
] as const;

type Credential = {
  id: string;
  kind: string;
  fileName: string;
  url: string;
  createdAt: string;
};

export function ProviderCredentialsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Credential[]>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("background_check");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    fetch("/api/provider/credentials")
      .then((r) => r.json())
      .then((d) => {
        if (on) setRows(d.credentials ?? []);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch("/api/provider/credentials", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Upload failed") });
      return;
    }
    setRows((prev) => [data.credential, ...prev]);
    toast({ variant: "success", title: t("Document uploaded") });
  }

  return (
    <section className="mb-10">
      <h2 className="mb-2 text-xl font-medium text-black">{t("Credentials")}</h2>
      <p className="mb-4 text-sm text-grey">
        {t("Upload your background check, government ID, licenses, and insurance. Admins can review them.")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as (typeof KINDS)[number]["id"])}
          className="h-10 rounded-xl border border-[#e4e8ee] px-3 text-sm"
        >
          {KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {t(item.label)}
            </option>
          ))}
        </select>
        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
          {busy ? t("Uploading…") : t("Upload")}
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <ul className="mt-4 divide-y divide-[#eceff3]">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{t(labelFor(row.kind))}</p>
              <p className="text-[12px] text-grey">{row.fileName}</p>
            </div>
            <a href={row.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--mvp-blue)]">
              {t("View")}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function labelFor(kind: string) {
  return KINDS.find((item) => item.id === kind)?.label ?? kind;
}
