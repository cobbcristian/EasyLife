"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Send } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatCurrency, formatDate } from "@/lib/utils";

type GuestCharge = {
  id: string;
  memberName: string;
  memberEmail: string | null;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
  payToken: string | null;
  createdAt: string;
};

type FeeKind = "accompanied" | "unaccompanied";

export function PmGuestFeesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [charges, setCharges] = useState<GuestCharge[]>([]);
  const [presets, setPresets] = useState({ accompanied: 25, unaccompanied: 50 });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [hostMemberName, setHostMemberName] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [feeKind, setFeeKind] = useState<FeeKind>("accompanied");
  const [note, setNote] = useState("USTA team match — non-member");
  const [busy, setBusy] = useState(false);
  const [lastPayUrl, setLastPayUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/guest-fees");
    if (!res.ok) return;
    const data = await res.json();
    setCharges(data.charges ?? []);
    if (data.presets) setPresets(data.presets);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLastPayUrl(null);
    const res = await fetch("/api/guest-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName,
        guestEmail,
        feeKind,
        hostMemberName: hostMemberName || undefined,
        matchDate: matchDate || undefined,
        note: note || undefined,
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "warning",
        title: t("Could not create invoice"),
        description: data.error ?? undefined,
      });
      return;
    }
    setLastPayUrl(data.payUrl ?? null);
    toast({
      variant: "success",
      title: t("Guest fee invoice created"),
      description: t("Copy the pay link and send it to the non-member."),
    });
    setGuestName("");
    setGuestEmail("");
    setHostMemberName("");
    setMatchDate("");
    await load();
    router.refresh();
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: "success", title: t("Pay link copied") });
    } catch {
      toast({ variant: "warning", title: t("Could not copy — select the link manually") });
    }
  }

  const amount =
    feeKind === "unaccompanied" ? presets.unaccompanied : presets.accompanied;

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={t("Court guest fees")}
        right="avatar"
        avatarName={profile.name}
      />
      <PageBody>
        <p className="mb-6 max-w-2xl text-sm text-grey">
          {t(
            "Invoice USTA / visiting players who are not club members. They get a pay link — no club login required.",
          )}
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div
            id="guest-fee-form"
            className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-1"
          >
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-black">
              <Send className="h-4 w-4 text-[var(--mvp-blue)]" />
              {t("Send guest fee invoice")}
            </h2>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="guestName">{t("Guest name")}</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jordan Lee"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail">{t("Guest email")}</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="jordan@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeKind">{t("Fee type")}</Label>
                <select
                  id="feeKind"
                  className="h-10 w-full rounded-lg border border-border-2 bg-white px-3 text-sm"
                  value={feeKind}
                  onChange={(e) => setFeeKind(e.target.value as FeeKind)}
                >
                  <option value="accompanied">
                    Accompanied — {formatCurrency(presets.accompanied)}
                  </option>
                  <option value="unaccompanied">
                    Unaccompanied — {formatCurrency(presets.unaccompanied)}
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">{t("Host / team contact (optional)")}</Label>
                <Input
                  id="host"
                  value={hostMemberName}
                  onChange={(e) => setHostMemberName(e.target.value)}
                  placeholder="Jordan Blake"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matchDate">{t("Match date (optional)")}</Label>
                <Input
                  id="matchDate"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">{t("Note")}</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <p className="text-sm font-medium text-ink">
                {t("Amount")}: {formatCurrency(amount)}
              </p>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? t("Creating...") : t("Create invoice + pay link")}
              </Button>
            </form>

            {lastPayUrl ? (
              <div className="mt-4 rounded-lg border border-[#c6efce] bg-[#f0fff4] p-3">
                <p className="mb-2 text-xs font-medium text-ink">
                  {t("Pay link — send to guest")}
                </p>
                <p className="mb-2 break-all text-xs text-grey">{lastPayUrl}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyLink(lastPayUrl)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {t("Copy link")}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-black">
              <Link2 className="h-4 w-4 text-[var(--mvp-blue)]" />
              {t("Guest fee invoices")}
            </h2>
            {charges.length === 0 ? (
              <div className="rounded-xl bg-[#f7f8fa] p-5">
                <p className="text-sm font-semibold text-ink">{t("No guest fee invoices yet.")}</p>
                <p className="mt-1 text-sm text-grey">
                  {t("Create one for a USTA visiting player using the form.")}
                </p>
                <a
                  href="#guest-fee-form"
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                >
                  {t("Create invoice")}
                </a>
              </div>
            ) : (
              <ul className="divide-y divide-border-2">
                {charges.map((c) => {
                  const payUrl =
                    typeof window !== "undefined" && c.payToken
                      ? `${window.location.origin}/pay/guest/${c.payToken}`
                      : c.payToken
                        ? `/pay/guest/${c.payToken}`
                        : null;
                  return (
                    <li
                      key={c.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{c.memberName}</p>
                        <p className="truncate text-sm text-grey">
                          {c.memberEmail} · {c.description}
                        </p>
                        <p className="text-xs text-grey">
                          {c.dueDate ? formatDate(c.dueDate) : ""} ·{" "}
                          {formatCurrency(c.amount)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={c.status === "paid" ? "success" : "warning"}
                        >
                          {c.status}
                        </Badge>
                        {payUrl && c.status !== "paid" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void copyLink(payUrl)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            {t("Copy link")}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
