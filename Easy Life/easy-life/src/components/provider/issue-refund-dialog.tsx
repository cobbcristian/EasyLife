"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Figma “Issue refund via Stripe?” dialog (3966:3436). */
export function IssueRefundDialog({
  open,
  onClose,
  onYes,
  onNo,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onYes: () => void;
  onNo: () => void;
  loading?: boolean;
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 font-[family-name:var(--font-poppins)]">
      <button type="button" className="absolute inset-0" aria-label={t("Close")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-refund-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2
          id="issue-refund-title"
          className="text-center text-lg font-semibold text-black"
        >
          {t("Issue refund via Stripe?")}
        </h2>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={onYes}
            className={cn(
              "flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-60",
            )}
          >
            {t("Yes")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onNo}
            className="flex h-[50px] w-full items-center justify-center rounded-lg border border-border-2 text-base font-semibold text-ink disabled:opacity-60"
          >
            {t("No")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-[50px] w-full items-center justify-center rounded-lg text-base font-semibold text-[var(--mvp-blue)] disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
