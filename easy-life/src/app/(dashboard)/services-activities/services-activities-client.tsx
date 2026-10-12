"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

type ProviderWithCommunity = Provider & {
  community: string;
  communityId?: string;
  email?: string;
};

/** Figma Services & Activities — super admin registry with freeze/delete. */
export function ServicesActivitiesClient({
  services,
  activities,
}: {
  services: ProviderWithCommunity[];
  activities: ProviderWithCommunity[];
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState(() => [
    ...activities.map((p) => ({ ...p, typeLabel: "Activity" as const })),
    ...services.map((p) => ({ ...p, typeLabel: "Service" as const })),
  ]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  async function setStatus(id: string, status: "active" | "frozen") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "warning", title: t("Update failed"), description: data.error });
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      toast({
        variant: "success",
        title: status === "frozen" ? t("Provider frozen") : t("Provider unfrozen"),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeProvider(id: string, name: string) {
    if (!window.confirm(`${t("Delete provider")} ${name}?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "warning", title: t("Delete failed"), description: data.error });
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ variant: "success", title: t("Provider deleted") });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Super Admin" right="logo" />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">
              {t("Services & Activities")}
            </h2>
            <p className="mt-1 text-sm text-grey">
              {t("Freeze or delete providers. Add new ones from a community page.")}
            </p>
          </div>
          <a
            href="/communities"
            className="text-sm font-medium text-[var(--mvp-blue)] hover:underline"
          >
            {t("Open communities to add")}
          </a>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border-2">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-2 text-black">
                <th className="px-5 py-3 font-semibold">{t("Name")}</th>
                <th className="px-5 py-3 font-semibold">{t("Type")}</th>
                <th className="px-5 py-3 font-semibold">{t("Community")}</th>
                <th className="px-5 py-3 font-semibold">{t("Status")}</th>
                <th className="px-5 py-3 font-semibold">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-ink">{t("No providers yet.")}</p>
                    <p className="mt-1 text-sm text-grey">
                      {t("Add new ones from a community page.")}
                    </p>
                    <a
                      href="/communities"
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                    >
                      {t("Open communities to add")} →
                    </a>
                  </td>
                </tr>
              ) : (
                sorted.map((row, index) => (
                  <tr
                    key={`${row.typeLabel}-${row.id}`}
                    className={cn(index % 2 === 0 && "bg-[#f6f9fc]")}
                  >
                    <td className="px-5 py-3.5 text-black">{row.name}</td>
                    <td className="px-5 py-3.5 text-[#262626]">{t(row.typeLabel)}</td>
                    <td className="px-5 py-3.5 text-[#262626]">{row.community}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          row.status === "frozen"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {row.status === "frozen" ? t("Frozen") : t("Active")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() =>
                            setStatus(
                              row.id,
                              row.status === "frozen" ? "active" : "frozen",
                            )
                          }
                          className="text-xs font-medium text-[var(--mvp-blue)] hover:underline disabled:opacity-50"
                        >
                          {row.status === "frozen" ? t("Unfreeze") : t("Freeze")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => removeProvider(row.id, row.name)}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          {t("Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageBody>
    </div>
  );
}
