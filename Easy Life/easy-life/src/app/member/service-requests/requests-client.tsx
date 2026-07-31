"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface RequestDTO {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  unit: string;
  createdAt: string;
}

const categories = ["Plumbing", "HVAC", "Electrical", "Cleaning", "General Maintenance"];

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

function statusClass(status: string) {
  if (status === "resolved") return "text-[var(--mvp-status-going)]";
  if (status === "in_progress") return "text-[var(--mvp-blue)]";
  return "text-[var(--mvp-status-pending)]";
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    case "pending":
      return "Pending";
    default:
      return status.replace(/_/g, " ");
  }
}

export function RequestsClient({ initialRequests }: { initialRequests: RequestDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !category || !description) {
      toast({
        variant: "warning",
        title: t("Missing details"),
        description: t("Complete all fields."),
      });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        description,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not submit") });
      return;
    }
    toast({
      variant: "success",
      title: t("Request submitted"),
      description: t("Property management notified."),
    });
    setTitle("");
    setCategory("");
    setDescription("");
    setFormOpen(false);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("Service Requests")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex h-10 items-center rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            {t("New")}
          </button>
        </header>

        <div className="px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <h2 className="text-[15px] font-semibold text-ink">{t("My Requests")}</h2>
          {initialRequests.length === 0 ? (
            <div className="mt-3 rounded-xl bg-[#f7f8fa] p-5">
              <p className="text-sm font-semibold text-ink">{t("No requests yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Need help from the club? Open a request and track status here.")}
              </p>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
              >
                {t("New request")}
              </button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {initialRequests.map((r) => (
                <li key={r.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold text-ink">{r.title}</p>
                    <span className={`shrink-0 text-[12px] font-semibold ${statusClass(r.status)}`}>
                      {t(statusLabel(r.status))}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-grey">
                    {t(r.category)} · {r.unit} · {formatDate(r.createdAt)}
                  </p>
                  <p className="mt-1.5 text-sm text-grey">{r.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6">
          <button
            type="button"
            aria-label={t("Close")}
            className="absolute inset-0"
            onClick={() => setFormOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg space-y-3 rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl md:rounded-3xl"
          >
            <div className="flex justify-center md:hidden">
              <span className="h-1.5 w-12 rounded-full bg-[#d8dde5]" />
            </div>
            <h2 className="text-lg font-semibold text-ink">{t("New Request")}</h2>
            <input
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Brief description")}
            />
            <select
              className={fieldClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("Select category")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>
            <textarea
              className="min-h-[100px] w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 py-3 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Describe the issue...")}
            />
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-12 flex-1 rounded-2xl text-sm font-semibold text-grey"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-12 flex-[1.4] rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("Submitting...") : t("Submit request")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
