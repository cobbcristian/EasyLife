"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export interface SurveyDTO {
  id: string;
  title: string;
  description: string;
  status: string;
  closes: string | null;
  options: { id: string; label: string; votes: number }[];
}

const bidStatus = {
  received: "default",
  under_review: "info",
  accepted: "success",
  rejected: "danger",
} as const;

export function GovernanceClient({
  surveys,
  votedIds,
  bids,
}: {
  surveys: SurveyDTO[];
  votedIds: string[];
  bids: { id: string; project: string; vendor: string; amount: number; status: string; date: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [busy, setBusy] = useState(false);

  async function vote(surveyId: string, optionId: string) {
    const res = await fetch(`/api/surveys/${surveyId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({ variant: "warning", title: t("Could not vote"), description: d.error ?? "" });
      return;
    }
    toast({ variant: "success", title: t("Vote recorded") });
    router.refresh();
  }

  async function createSurvey(e: React.FormEvent) {
    e.preventDefault();
    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    if (!title || options.length < 2) {
      toast({ variant: "warning", title: t("Title and 2+ options required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, options }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create") });
      return;
    }
    toast({ variant: "success", title: t("Survey created") });
    setTitle("");
    setDescription("");
    setOptionsText("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Governance")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[21px] font-medium text-black">{t("Voting & Surveys")}</h2>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            {showForm ? t("Close") : t("New survey")}
          </Button>
        </div>

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <h3 className="mb-4 text-base font-medium text-black">{t("New survey")}</h3>
            <form className="space-y-4" onSubmit={createSurvey}>
              <div className="space-y-2">
                <Label htmlFor="title">{t("Question")}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t("Description")}</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opts">{t("Options (one per line)")}</Label>
                <Textarea
                  id="opts"
                  rows={3}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"Approve\nReject"}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? t("Creating...") : t("Create survey")}
              </Button>
            </form>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {surveys.map((s) => {
            const total = s.options.reduce((sum, o) => sum + o.votes, 0) || 1;
            const voted = votedIds.includes(s.id);
            return (
              <div key={s.id} className="rounded-xl border border-border-2 bg-white p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium text-black">{s.title}</h3>
                    <p className="mt-1 text-sm text-grey">{s.description}</p>
                  </div>
                  <Badge variant={s.status === "open" ? "success" : "default"}>{t(s.status)}</Badge>
                </div>
                <div className="space-y-3">
                  {s.options.map((o) => {
                    const pct = Math.round((o.votes / total) * 100);
                    return (
                      <div key={o.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-2">{o.label}</span>
                          <span className="font-medium text-ink">{pct}%</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-2">
                            <div
                              className="h-full rounded-full bg-[var(--mvp-blue)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {!voted && s.status === "open" ? (
                            <Button size="sm" variant="outline" onClick={() => vote(s.id, o.id)}>
                              {t("Vote")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-grey-light">
                    {total} {t("votes")}
                    {s.closes ? ` · ${t("closes")} ${s.closes}` : ""}
                    {voted ? ` · ${t("you voted")}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mb-4 mt-10 text-[21px] font-medium text-black">
          {t("Bid & Proposal Management")}
        </h2>
        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                  <th className="px-5 py-3 font-medium">{t("Project")}</th>
                  <th className="px-5 py-3 font-medium">{t("Vendor")}</th>
                  <th className="px-5 py-3 font-medium">{t("Amount")}</th>
                  <th className="px-5 py-3 font-medium">{t("Date")}</th>
                  <th className="px-5 py-3 font-medium">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, idx) => (
                  <tr
                    key={b.id}
                    className={cn(
                      "border-b border-border-2 last:border-0",
                      idx % 2 === 1 && "bg-[#fafbfc]",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-ink">{b.project}</td>
                    <td className="px-5 py-3 text-gray-2">{b.vendor}</td>
                    <td className="px-5 py-3 text-gray-2">{formatCurrency(b.amount)}</td>
                    <td className="px-5 py-3 text-gray-2">{formatDate(b.date)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={bidStatus[b.status as keyof typeof bidStatus] ?? "default"}>
                        {t(b.status.replace("_", " "))}
                      </Badge>
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
