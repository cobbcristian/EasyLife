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
  expiresOn?: string | null;
  createdAt: string;
};

export function ProviderCredentialsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Credential[]>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("background_check");
  const [expiresOn, setExpiresOn] = useState("");
  const [busy, setBusy] = useState(false);
  const needsDate = kind === "license" || kind === "insurance";

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
    if (needsDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
      setBusy(false);
      toast({ variant: "warning", title: t("Add the expiration date") });
      return;
    }
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    if (needsDate) form.set("expiresOn", expiresOn);
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
        {needsDate ? (
          <input
            type="date"
            required
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            aria-label={t("Expiration date")}
            className="h-10 rounded-xl border border-[#e4e8ee] px-3 text-sm"
          />
        ) : null}
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
              <p className="text-[12px] text-grey">
                {row.fileName}
                {row.expiresOn ? ` · ${t("Expires")} ${row.expiresOn}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {row.kind === "license" || row.kind === "insurance" ? (
                <input
                  type="date"
                  defaultValue={row.expiresOn ?? ""}
                  aria-label={t("Expiration date")}
                  className="h-9 rounded-lg border border-[#e4e8ee] px-2 text-[12px]"
                  onChange={(e) => {
                    const expiresOn = e.target.value;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return;
                    void fetch("/api/provider/credentials", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: row.id, expiresOn }),
                    }).then((res) => {
                      if (!res.ok) {
                        toast({ variant: "warning", title: t("Could not save expiration date") });
                        return;
                      }
                      setRows((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, expiresOn } : item)),
                      );
                    });
                  }}
                />
              ) : null}
              <a href={row.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--mvp-blue)]">
                {t("View")}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function labelFor(kind: string) {
  return KINDS.find((item) => item.id === kind)?.label ?? kind;
}
