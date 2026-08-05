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

interface CheckinEntry {
  id: string;
  name: string;
  type: string;
  host: string;
  time: string;
  status: string;
  service?: string;
  admitWithoutCall?: boolean;
}

interface ServiceRequest {
  id: string;
  title: string;
  category: string;
  status: string;
  unit: string;
  memberName: string;
}

type CheckinBadgeVariant = "success" | "warning" | "default";
type TaskBadgeVariant = "info" | "warning";

function checkinBadgeVariant(status: string): CheckinBadgeVariant {
  switch (status) {
    case "checked_in":
      return "success";
    case "expected":
      return "warning";
    default:
      return "default";
  }
}

function taskBadgeVariant(status: string): TaskBadgeVariant {
  switch (status) {
    case "in_progress":
      return "info";
    default:
      return "warning";
  }
}

export default function PmHomePage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        setAvatarName(d.name ?? "");
        setCommunityName(d.communityName ?? "");
      })
      .catch(() => {});

    fetch("/api/checkins")
      .then((r) => r.json())
      .then((d) => setCheckins(d.checkins ?? []))
      .catch(() => {});

    fetch("/api/service-requests")
      .then((r) => r.json())
      .then((d) => setServiceRequests(d.requests ?? []))
      .catch(() => {});
  }, []);

  const expected = checkins.filter((c) => c.status === "expected").length;
  const openTasks = serviceRequests.filter(
    (task) => task.status !== "done" && task.status !== "resolved",
  );
  const inProgress = serviceRequests.filter((task) => task.status === "in_progress");

  const statCards = [
    {
      title: t("Expected Today"),
      value: String(expected),
      href: "/pm/front-desk",
    },
    {
      title: t("Open Tasks"),
      value: String(openTasks.length),
      href: "/pm/maintenance",
    },
    {
      title: t("In Progress"),
      value: String(inProgress.length),
      href: "/pm/maintenance",
    },
  ];

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={`${t("Property Management")} — ${communityName || "…"}`}
        right="avatar"
        avatarName={avatarName}
        translateTitle={false}
      />
      <PageBody>
        <PortalPageIntro
          eyebrow="Property manager workspace"
          title="Overview"
          description="Day-to-day club operations — front desk and maintenance. Not platform setup or board meetings."
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-xl bg-[var(--mvp-blue)] p-5 text-white shadow-[0_5px_20px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
            >
              <p className="text-sm font-medium text-white/90">{card.title}</p>
              <p className="mt-6 text-3xl font-semibold">{card.value}</p>
            </a>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[21px] font-medium text-black">{t("Front Desk — Today")}</h2>
              <Link href="/pm/front-desk" className="shrink-0 text-sm font-medium text-[var(--mvp-blue)]">
                {t("Manage")}
              </Link>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              {checkins.length === 0 ? (
                <EmptyState
                  title={t("No check-ins today.")}
                  description={t(
                    "Guests and approved provider visits from the member calendar appear here. Admit at the gate without calling the host.",
                  )}
                  className="border-0 bg-transparent py-8"
                  action={
                    <Link
                      href="/pm/front-desk"
                      className="inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Open front desk")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {checkins.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">{c.name}</p>
                        <p className="text-xs text-grey">
                          {c.type}
                          {c.admitWithoutCall ? ` · ${t("approved visit")}` : ""} · {c.host} ·{" "}
                          {c.time}
                        </p>
                        {c.service ? (
                          <p className="truncate text-xs text-[var(--mvp-blue)]">{c.service}</p>
                        ) : null}
                      </div>
                      <Badge variant={checkinBadgeVariant(c.status)}>
                        {t(c.status.replace("_", " "))}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[21px] font-medium text-black">{t("Maintenance Queue")}</h2>
              <Link href="/pm/maintenance" className="shrink-0 text-sm font-medium text-[var(--mvp-blue)]">
                {t("View all")}
              </Link>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              {openTasks.length === 0 ? (
                <EmptyState
                  title={t("No open tasks.")}
                  description={t("Service requests and maintenance jobs will show up here.")}
                  className="border-0 bg-transparent py-8"
                  action={
                    <Link
                      href="/pm/maintenance"
                      className="inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Log a task")}
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {openTasks.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border-2 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">{task.title}</p>
                        <p className="text-xs text-grey">
                          {task.category} · {task.memberName} · {task.unit}
                        </p>
                      </div>
                      <Badge variant={taskBadgeVariant(task.status)}>
                        {t(task.status.replace("_", " "))}
                      </Badge>
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
