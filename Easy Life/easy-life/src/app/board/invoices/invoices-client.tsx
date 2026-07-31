"use client";

import { useRouter } from "next/navigation";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export interface InvoiceDTO {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  status: string;
  submittedBy: string;
  createdAt: string;
}

const statusVariant = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const;

export function InvoicesClient({ initial }: { initial: InvoiceDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();

  async function decide(id: string, status: "approved" | "rejected") {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update") });
      return;
    }
    toast({ variant: status === "approved" ? "success" : "info", title: `${t("Invoice")} ${t(status)}` });
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Vendor Invoices")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                  <th className="px-5 py-3 font-medium">{t("Vendor")}</th>
                  <th className="px-5 py-3 font-medium">{t("Description")}</th>
                  <th className="px-5 py-3 font-medium">{t("Amount")}</th>
                  <th className="px-5 py-3 font-medium">{t("Submitted by")}</th>
                  <th className="px-5 py-3 font-medium">{t("Date")}</th>
                  <th className="px-5 py-3 font-medium">{t("Status")}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {initial.map((i, idx) => (
                  <tr
                    key={i.id}
                    className={cn(
                      "border-b border-border-2 last:border-0",
                      idx % 2 === 1 && "bg-[#fafbfc]",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-ink">{i.vendor}</td>
                    <td className="px-5 py-3 text-gray-2">{i.description}</td>
                    <td className="px-5 py-3 text-gray-2">{formatCurrency(i.amount)}</td>
                    <td className="px-5 py-3 text-gray-2">{i.submittedBy}</td>
                    <td className="px-5 py-3 text-gray-2">{formatDate(i.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={statusVariant[i.status as keyof typeof statusVariant] ?? "warning"}>
                        {t(i.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {i.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => decide(i.id, "approved")}>
                            {t("Approve")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => decide(i.id, "rejected")}>
                            {t("Reject")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
