"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { ProviderClinicInviteSheet } from "@/components/provider/provider-clinic-invite-sheet";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatCurrency } from "@/lib/utils";

type ClinicRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  endTime: string | null;
  location: string;
  category: string;
  capacity: number | null;
  requirePayment: boolean;
  feeCents: number;
  goingCount: number;
  rsvps: Array<{ name: string; email: string }>;
};

export default function ProviderClinicsPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/provider/clinics")
      .then((r) => r.json())
      .then((d) => setClinics(d.clinics ?? []))
      .catch(() => setClinics([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Clinics")} avatarName={profile.name} showMessages />
      <PageBody>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[21px] font-medium text-black">{t("Group clinics")}</h2>
            <p className="mt-1 text-sm text-grey">
              {t(
                "Invite members and guests. Collect payment, track Going / Not going, set a cap, and repeat weekly.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("New clinic invite")}
          </button>
        </div>

        {clinics.length === 0 ? (
          <div className="rounded-xl border border-border-2 bg-white px-5 py-10 text-center">
            <p className="text-sm font-semibold text-ink">{t("No clinics yet.")}</p>
            <p className="mt-1 text-sm text-grey">
              {t("Invite a group to your next tennis, golf, or bocce clinic.")}
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              {t("New clinic invite")}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {clinics.map((c) => {
              const spots = c.capacity
                ? `${c.goingCount} / ${c.capacity} ${t("going")}`
                : `${c.goingCount} ${t("going")}`;
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-border-2 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{c.title}</p>
                      <p className="mt-0.5 text-[12px] text-grey">
                        {c.date}
                        {c.time ? ` · ${c.time}` : ""}
                        {c.location ? ` · ${c.location}` : ""}
                      </p>
                      <p className="mt-1 text-[12px] capitalize text-[var(--mvp-blue)]">
                        {c.category.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right text-[12px] text-grey">
                      <p className="font-semibold text-ink">{spots}</p>
                      {c.requirePayment ? (
                        <p>
                          {formatCurrency(c.feeCents / 100)} {t("member")} ·{" "}
                          {formatCurrency((c.feeCents * 2) / 100)} {t("guest")}
                        </p>
                      ) : (
                        <p>{t("No fee")}</p>
                      )}
                    </div>
                  </div>
                  {c.rsvps.length > 0 ? (
                    <p className="mt-3 line-clamp-2 text-[12px] text-grey">
                      {c.rsvps.map((r) => r.name).join(", ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>

      <ProviderClinicInviteSheet
        open={open}
        onClose={() => setOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
