"use client";

import { useState } from "react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

type PendingRow = {
  id: string;
  email: string;
  name: string;
  unit: string | null;
  createdAt: string;
};

export function MemberApprovalsClient({ initial }: { initial: PendingRow[] }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(userId: string, action: "approve" | "reject") {
    setBusyId(userId);
    try {
      const res = await fetch("/api/pm/member-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({
          variant: "warning",
          title:
            action === "approve"
              ? t("Could not approve")
              : t("Could not reject"),
          description: data.error,
        });
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== userId));
      if (action === "approve") {
        toast({
          variant: "success",
          title: t("Member approved"),
          description: t("They can sign in and appear in the directory."),
        });
      } else {
        toast({
          variant: "success",
          title: t("Registration rejected"),
          description: t("Their pending account was removed."),
        });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={t("Member approvals")}
        right="avatar"
        avatarName={profile.name}
      />
      <PageBody>
        <p className="mb-6 text-sm text-grey">
          {t(
            "Residents who self-registered wait here until you approve them. Approval activates login and directory visibility. Reject removes the pending registration.",
          )}
        </p>
        <div className="overflow-x-auto rounded-xl border border-[#e8ebf0] bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8ebf0] text-grey">
                <th className="px-4 py-3 font-medium">{t("Name")}</th>
                <th className="px-4 py-3 font-medium">{t("Email")}</th>
                <th className="px-4 py-3 font-medium">{t("Unit")}</th>
                <th className="px-4 py-3 font-medium">{t("Requested")}</th>
                <th className="px-4 py-3 font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-grey">
                    {t("No pending registrations.")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#e8ebf0] last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-3 text-grey">{r.email}</td>
                    <td className="px-4 py-3 text-ink">{r.unit ?? "—"}</td>
                    <td className="px-4 py-3 text-grey">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void act(r.id, "approve")}
                          className="rounded-lg bg-[var(--mvp-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {busyId === r.id ? t("Working…") : t("Approve")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => {
                            if (
                              !window.confirm(
                                t(
                                  "Reject this registration? Their pending account will be deleted.",
                                ),
                              )
                            ) {
                              return;
                            }
                            void act(r.id, "reject");
                          }}
                          className="rounded-lg border border-[#f0cfd0] bg-[#fff5f5] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:opacity-50"
                        >
                          {t("Reject")}
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
