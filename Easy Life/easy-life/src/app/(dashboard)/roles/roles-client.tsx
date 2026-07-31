"use client";

import { useState } from "react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

const roles = ["Member", "Board", "Property Mgr", "Provider", "Admin"] as const;
type Role = (typeof roles)[number];

const permissionList = [
  "View directory",
  "Book amenities",
  "Pay dues",
  "Manage documents",
  "Approve invoices",
  "Manage communities",
  "Manage users & roles",
  "View financial reports",
  "Front desk check-in",
];

export function RolesClient({ initial }: { initial: Record<string, string[]> }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [matrix, setMatrix] = useState<Record<string, Role[]>>(initial as Record<string, Role[]>);
  const [saving, setSaving] = useState(false);

  function toggle(perm: string, role: Role) {
    setMatrix((prev) => {
      const has = prev[perm]?.includes(role);
      return {
        ...prev,
        [perm]: has ? prev[perm].filter((r) => r !== role) : [...(prev[perm] ?? []), role],
      };
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matrix }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Save failed") });
      return;
    }
    toast({ variant: "success", title: t("Permissions saved") });
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Roles & Permissions" right="logo" />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-grey">
            {t("Control what each role can do across the platform.")}
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? t("Saving…") : t("Save changes")}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 text-grey">
                  <th className="px-5 py-3 font-medium">{t("Permission")}</th>
                  {roles.map((r) => (
                    <th key={r} className="px-4 py-3 text-center font-medium">
                      {t(r)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionList.map((perm) => (
                  <tr key={perm} className="border-b border-border-2 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{t(perm)}</td>
                    {roles.map((r) => (
                      <td key={r} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={matrix[perm]?.includes(r) ?? false}
                          onChange={() => toggle(perm, r)}
                          aria-label={`${perm} for ${r}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Terms of Service", href: "/terms" },
            { name: "Privacy Policy", href: "/privacy" },
          ].map((doc) => (
            <div key={doc.name} className="rounded-xl border border-border-2 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-medium text-black">{t(doc.name)}</h2>
                <Badge variant="success">{t("Published")}</Badge>
              </div>
              <a href={doc.href} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">{t("View & edit")}</Button>
              </a>
            </div>
          ))}
        </div>
      </PageBody>
    </div>
  );
}
