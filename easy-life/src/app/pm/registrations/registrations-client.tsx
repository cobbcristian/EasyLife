"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

interface Registration {
  id: string;
  resident: string;
  unit: string;
  vehicle: boolean;
  pet: boolean;
  fingerprint: boolean;
}

function Cell({ ok, onClick, t }: { ok: boolean; onClick: () => void; t: (key: string) => string }) {
  return (
    <button type="button" onClick={onClick} aria-label={ok ? t("Complete") : t("Incomplete")}>
      {ok ? (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-grey-light">
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

export function RegistrationsClient({ initial }: { initial: Registration[] }) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [rows, setRows] = useState(initial);

  async function toggle(id: string, field: "vehicle" | "pet" | "fingerprint", value: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await fetch("/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field, value }),
    });
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Registrations Checklist")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                  <th className="px-5 py-3 font-medium">{t("Resident")}</th>
                  <th className="px-5 py-3 font-medium">{t("Unit")}</th>
                  <th className="px-5 py-3 font-medium">{t("Vehicle")}</th>
                  <th className="px-5 py-3 font-medium">{t("Pet")}</th>
                  <th className="px-5 py-3 font-medium">{t("Fingerprint")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-grey">
                      {t("No registration checklists yet. New residents will appear here as they move in.")}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border-2 last:border-0",
                        idx % 2 === 1 && "bg-[#fafbfc]",
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-ink">{r.resident}</td>
                      <td className="px-5 py-3 text-gray-2">{r.unit}</td>
                      <td className="px-5 py-3">
                        <Cell ok={r.vehicle} onClick={() => toggle(r.id, "vehicle", !r.vehicle)} t={t} />
                      </td>
                      <td className="px-5 py-3">
                        <Cell ok={r.pet} onClick={() => toggle(r.id, "pet", !r.pet)} t={t} />
                      </td>
                      <td className="px-5 py-3">
                        <Cell
                          ok={r.fingerprint}
                          onClick={() => toggle(r.id, "fingerprint", !r.fingerprint)}
                          t={t}
                        />
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
