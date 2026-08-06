"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { downloadIcs } from "@/lib/calendar-ics";
import { cn } from "@/lib/utils";

type SyncLinks = {
  httpsUrl: string;
  webcalUrl: string;
  appleUrl: string;
  googleUrl: string;
  outlookUrl: string;
  outlookOfficeUrl: string;
  instructions: {
    apple: string;
    google: string;
    outlook: string;
  };
};

const PROVIDERS = [
  {
    id: "apple" as const,
    label: "Apple Calendar",
    hrefKey: "appleUrl" as const,
    hint: "iPhone, iPad, and Mac",
  },
  {
    id: "google" as const,
    label: "Google Calendar",
    hrefKey: "googleUrl" as const,
    hint: "Gmail and Android",
  },
  {
    id: "outlook" as const,
    label: "Outlook",
    hrefKey: "outlookUrl" as const,
    hint: "Outlook.com",
  },
  {
    id: "outlookOffice" as const,
    label: "Microsoft 365",
    hrefKey: "outlookOfficeUrl" as const,
    hint: "Work / school Outlook",
  },
];

/** Subscribe Easy Life agenda to Google, Apple, Outlook via ICS feed. */
export function CalendarSyncSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [links, setLinks] = useState<SyncLinks | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/member/calendar/sync")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        if (!cancelled) setLinks(data as SyncLinks);
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            variant: "warning",
            title: t("Could not prepare calendar sync"),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t, toast]);

  if (!open) return null;

  async function copyFeed() {
    if (!links?.httpsUrl) return;
    try {
      await navigator.clipboard.writeText(links.httpsUrl);
      setCopied(true);
      toast({ variant: "success", title: t("Feed URL copied") });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "warning", title: t("Could not copy link") });
    }
  }

  async function downloadFeedIcs() {
    try {
      const res = await fetch("/api/member/calendar/sync?download=1");
      if (!res.ok) throw new Error("download failed");
      const ics = await res.text();
      if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("invalid ics");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1]?.trim() || "club-calendar.ics";
      const result = await downloadIcs(filename, ics);
      if (!result.ok) {
        toast({
          variant: "warning",
          title: t("Could not download calendar file"),
        });
        return;
      }
      if (result.method === "native" || result.method === "share") {
        toast({
          variant: "success",
          title: t("Share the calendar file to save it"),
        });
      }
    } catch {
      toast({
        variant: "warning",
        title: t("Could not download calendar file"),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-sync-title"
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h2
              id="calendar-sync-title"
              className="text-lg font-semibold text-ink"
            >
              {t("Sync calendar")}
            </h2>
            <p className="mt-1 text-[13px] text-grey">
              {t(
                "Keep club events and your bookings in Google, Apple, Outlook, or Microsoft 365. Subscribed calendars refresh automatically.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-grey hover:bg-[#f2f4f7]"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {PROVIDERS.map((provider) => {
            const href = links?.[provider.hrefKey];
            return (
              <a
                key={provider.id}
                href={href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!href) e.preventDefault();
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-[#e8ebf0] px-4 py-3 transition",
                  href
                    ? "hover:border-[var(--mvp-blue)]/40 hover:bg-[#f8fafc]"
                    : "pointer-events-none opacity-50",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {t(provider.label)}
                  </p>
                  <p className="text-[12px] text-grey">{t(provider.hint)}</p>
                </div>
                <span className="text-[12px] font-semibold text-[var(--mvp-blue)]">
                  {loading ? t("Loading…") : t("Connect")}
                </span>
              </a>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
          <p className="text-[12px] font-semibold text-ink">
            {t("Or paste this feed URL")}
          </p>
          <p className="mt-1 break-all text-[11px] text-grey">
            {links?.httpsUrl ?? (loading ? t("Preparing link…") : "—")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyFeed()}
              disabled={!links?.httpsUrl}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-semibold text-ink ring-1 ring-[#e4e8ee] disabled:opacity-40"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[var(--mvp-status-going)]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {t("Copy URL")}
            </button>
            <button
              type="button"
              onClick={() => void downloadFeedIcs()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              {t("Download .ics")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
