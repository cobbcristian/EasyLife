"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ContentHeader,
  PageBody,
  PortalPageIntro,
} from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/page-header";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BoardEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string;
}

interface Survey {
  id: string;
  status: string;
}

interface BudgetLine {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
}

interface Invoice {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function BoardHomePage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [schedule, setSchedule] = useState<BoardEvent[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setAvatarName(d.name ?? "");
        setCommunityName(d.communityName ?? "");
      })
      .catch(() => {});

    fetch("/api/events?category=board")
      .then((r) => r.json())
      .then((d) => setSchedule((d.events ?? []).slice(0, 3)))
      .catch(() => {});

    fetch("/api/surveys")
      .then((r) => r.json())
      .then((d) => setSurveys(d.surveys ?? []))
      .catch(() => {});

    fetch("/api/budget")
      .then((r) => r.json())
      .then((d) => setBudgetLines(d.lines ?? []))
      .catch(() => {});

    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(() => {});
  }, []);

  const openSurveys = surveys.filter((s) => s.status === "open").length;
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const reserves = budgetLines.find((b) => /reserve/i.test(b.category));

  const statCards = [
    {
      title: t("Open Votes"),
      value: String(openSurveys),
      href: "/board/governance",
    },
    {
      title: t("Invoices to Review"),
      value: String(pendingInvoices.length),
      href: "/board/invoices",
    },
    {
      title: t("Reserves Funded"),
      value: reserves ? formatCurrency(reserves.spent) : "—",
      subtitle: reserves ? `${t("of")} ${formatCurrency(reserves.budgeted)}` : undefined,
      href: "/board/budget",
    },
  ];

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={`${t("Board")} — ${communityName || "…"}`}
        right="avatar"
        avatarName={avatarName}
        translateTitle={false}
      />
      <PageBody>
        <PortalPageIntro
          eyebrow="Board workspace"
          title="Overview"
          description="Club meetings and governance — votes, invoices, and board events. Platform setup lives in Managing Club."
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl bg-[var(--mvp-blue)] p-5 text-white shadow-[0_5px_20px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
            >
              <p className="text-sm font-medium text-white/90">{card.title}</p>
              <p className="mt-6 text-3xl font-semibold">{card.value}</p>
              {card.subtitle ? (
                <p className="mt-1 text-xs text-white/80">{card.subtitle}</p>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[21px] font-medium text-black">{t("Upcoming Board Events")}</h2>
              <Link href="/board/scheduler" className="shrink-0 text-sm font-medium text-[var(--mvp-blue)]">
                {t("View all")}
              </Link>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              {schedule.length === 0 ? (
                <EmptyState
                  title={t("No upcoming events.")}
                  description={t("Board meetings and workshops will appear here.")}
                  className="border-0 bg-transparent py-8"
                  action={
                    <Link
                      href="/board/scheduler"
                      className="inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Schedule event")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {schedule.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 rounded-lg border border-border-2 p-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-[#e8f4fc] text-[var(--mvp-blue)]">
                        <span className="text-[10px] font-medium uppercase">
                          {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-sm font-bold">{new Date(e.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-black">{e.title}</p>
                        <p className="text-xs text-grey">
                          {e.time ?? "—"} · {e.location}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[21px] font-medium text-black">{t("Pending Invoices")}</h2>
              <Link href="/board/invoices" className="shrink-0 text-sm font-medium text-[var(--mvp-blue)]">
                {t("Review")}
              </Link>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              {pendingInvoices.length === 0 ? (
                <EmptyState
                  title={t("No pending invoices.")}
                  description={t("Invoices waiting for board review will show up here.")}
                  className="border-0 bg-transparent py-8"
                  action={
                    <Link
                      href="/board/invoices"
                      className="inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Open invoices")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {pendingInvoices.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">{i.vendor}</p>
                        <p className="text-xs text-grey">
                          {i.description} · {formatDate(i.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-bold text-black">{formatCurrency(i.amount)}</span>
                        <Badge variant="warning">{t("pending")}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
