"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type SurveyOption = { id: string; label: string; votes: number };
type SurveyRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  options: SurveyOption[];
};

export default function MemberSurveysPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [voted, setVoted] = useState<string[]>([]);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    void fetch("/api/surveys")
      .then((r) => r.json())
      .then((d) => {
        setSurveys(d.surveys ?? []);
        setVoted(d.voted ?? []);
      })
      .catch(() => setSurveys([]));
  }, []);

  async function vote(surveyId: string, optionId: string) {
    setBusy(surveyId);
    const res = await fetch(`/api/surveys/${surveyId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    setBusy("");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast({ variant: "warning", title: t(data.error ?? "Could not record that vote") });
      return;
    }
    setVoted((prev) => [...prev, surveyId]);
    setSurveys((prev) =>
      prev.map((survey) =>
        survey.id === surveyId
          ? {
              ...survey,
              options: survey.options.map((option) =>
                option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
              ),
            }
          : survey,
      ),
    );
  }

  const open = surveys.filter((survey) => survey.status === "open");

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Surveys")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Vote on questions from the board. One vote each.")}</p>
      </div>
      {open.length === 0 ? <p className="text-sm text-grey">{t("No open surveys.")}</p> : null}
      {open.map((survey) => {
        const done = voted.includes(survey.id);
        return (
          <section key={survey.id} className="rounded-xl border border-border-2 bg-white p-4">
            <h2 className="text-base font-semibold text-ink">{survey.title}</h2>
            {survey.description ? <p className="mt-1 text-sm text-grey">{survey.description}</p> : null}
            <div className="mt-3 space-y-2">
              {survey.options.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  disabled={done || busy === survey.id}
                  onClick={() => void vote(survey.id, option.id)}
                  className="h-auto w-full justify-between whitespace-normal px-3 py-2 text-left"
                >
                  <span>{option.label}</span>
                  <span className="text-grey">{option.votes}</span>
                </Button>
              ))}
            </div>
            {done ? <p className="mt-2 text-xs text-grey">{t("Your vote is in.")}</p> : null}
          </section>
        );
      })}
    </PageBody>
  );
}
