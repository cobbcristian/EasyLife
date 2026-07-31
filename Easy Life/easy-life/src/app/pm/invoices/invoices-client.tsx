"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export interface PmInvoiceDTO {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
}

const statusVariant = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const;

export function PmInvoicesClient({ initial }: { initial: PmInvoiceDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !amount) {
      toast({ variant: "warning", title: t("Vendor and amount required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor, description, amount: Number(amount) }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not submit") });
      return;
    }
    toast({
      variant: "success",
      title: t("Invoice submitted"),
      description: t("Sent to the board for approval."),
    });
    setVendor("");
    setDescription("");
    setAmount("");
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Vendor Invoices")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-black">
              <Upload className="h-4 w-4 text-[var(--mvp-blue)]" /> {t("Submit invoice")}
            </h2>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="vendor">{t("Vendor")}</Label>
                <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t("Description")}</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("Amount ($)")}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? t("Submitting...") : t("Submit to board")}
              </Button>
            </form>
          </div>

          <div className="overflow-hidden rounded-xl border border-border-2 bg-white lg:col-span-2">
            <div className="border-b border-border-2 px-5 py-4">
              <h2 className="text-base font-medium text-black">{t("Submitted invoices")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                    <th className="px-5 py-3 font-medium">{t("Vendor")}</th>
                    <th className="px-5 py-3 font-medium">{t("Amount")}</th>
                    <th className="px-5 py-3 font-medium">{t("Date")}</th>
                    <th className="px-5 py-3 font-medium">{t("Board Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {initial.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-grey">
                        {t("No vendor invoices yet. Submit one on the left to start the board approval demo.")}
                      </td>
                    </tr>
                  ) : (
                    initial.map((i, idx) => (
                      <tr
                        key={i.id}
                        className={cn(
                          "border-b border-border-2 last:border-0",
                          idx % 2 === 1 && "bg-[#fafbfc]",
                        )}
                      >
                        <td className="px-5 py-3 font-medium text-ink">{i.vendor}</td>
                        <td className="px-5 py-3 text-gray-2">{formatCurrency(i.amount)}</td>
                        <td className="px-5 py-3 text-gray-2">{formatDate(i.createdAt)}</td>
                        <td className="px-5 py-3">
                          <Badge
                            variant={statusVariant[i.status as keyof typeof statusVariant] ?? "warning"}
                          >
                            {t(i.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
