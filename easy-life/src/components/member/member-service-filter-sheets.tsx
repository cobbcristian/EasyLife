"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BrandStar } from "@/components/ui/brand-star";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Categories for member Vendors (club pros) plus common home-service labels. */
export const SERVICE_CATEGORIES = [
  "Tennis",
  "Pickleball",
  "Spa",
  "Fitness",
  "Cleaning",
  "Lawn Care",
  "Plumbing",
  "Construction",
  "Window Cleaning",
  "Event Planning",
  "Catering",
  "Golf",
] as const;

/** Figma Service Category Sheet (4616:21238). */
export function ServiceCategorySheet({
  open,
  selected,
  onClose,
  onApply,
  categories = SERVICE_CATEGORIES,
}: {
  open: boolean;
  selected: string[];
  onClose: () => void;
  onApply: (categories: string[]) => void;
  /** When provided, only these labels appear (hides empty Golf on HOA demos). */
  categories?: readonly string[];
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(selected);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevSelected, setPrevSelected] = useState(selected);

  if (open !== prevOpen || selected !== prevSelected) {
    setPrevOpen(open);
    setPrevSelected(selected);
    if (open) setDraft(selected);
  }

  if (!open) return null;

  function toggle(cat: string) {
    setDraft((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  return (
    <BottomSheet title={t("Category")} onClose={onClose}>
      <ul className="space-y-1">
        {categories.map((cat) => {
          const checked = draft.includes(cat);
          return (
            <li key={cat}>
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="flex w-full items-center justify-between py-3 text-left text-base text-black"
              >
                {t(cat)}
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                    checked
                      ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white"
                      : "border-border-2 bg-white",
                  )}
                >
                  {checked ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <SheetFooter
        onClear={() => setDraft([])}
        onApply={() => {
          onApply(draft);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

/** Figma Service Rating Sheet (4616:21153). */
export function ServiceRatingSheet({
  open,
  selected,
  onClose,
  onApply,
}: {
  open: boolean;
  selected: number | null;
  onClose: () => void;
  onApply: (minRating: number | null) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<number | null>(selected);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevSelected, setPrevSelected] = useState(selected);

  if (open !== prevOpen || selected !== prevSelected) {
    setPrevOpen(open);
    setPrevSelected(selected);
    if (open) setDraft(selected);
  }

  if (!open) return null;

  return (
    <BottomSheet title={t("Rating")} onClose={onClose}>
      <ul className="space-y-1">
        {[1, 2, 3, 4, 5].map((stars) => {
          const checked = draft === stars;
          return (
            <li key={stars}>
              <button
                type="button"
                onClick={() => setDraft(stars)}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="flex items-center gap-1.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <BrandStar key={i} className="h-4 w-4" />
                  ))}
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                    checked
                      ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white"
                      : "border-border-2 bg-white",
                  )}
                >
                  {checked ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <SheetFooter
        onClear={() => setDraft(null)}
        onApply={() => {
          onApply(draft);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

/** Figma Business Hours sheet (4616:21329). */
export function ServiceHoursSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  const rows = [
    { label: "Sunday", hours: "11:00AM - 5:00PM" },
    { label: "Mon - Fri", hours: "9:00AM - 6:00PM" },
    { label: "Saturday", hours: "10:00AM - 6:00PM" },
  ];

  return (
    <BottomSheet title={t("Hours")} onClose={onClose}>
      <ul className="space-y-5 pb-4">
        {rows.map((row) => (
          <li key={row.label}>
            <p className="text-sm font-medium text-black">{t(row.label)}</p>
            <p className="mt-1 text-sm text-grey">{row.hours}</p>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

/** Figma address action sheet (4616:21339). */
export function ServiceAddressSheet({
  open,
  address,
  onClose,
}: {
  open: boolean;
  address: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  const mapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(address)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 font-[family-name:var(--font-poppins)] sm:items-center">
      <button type="button" className="absolute inset-0" aria-label={t("Close")} onClick={onClose} />
      <div className="relative w-full max-w-sm space-y-2">
        <div className="overflow-hidden rounded-xl bg-white/95 backdrop-blur">
          <p className="border-b border-border-2 px-4 py-4 text-center text-sm text-black">
            {address}
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block px-4 py-3.5 text-center text-base font-medium text-[var(--mvp-blue)]"
          >
            {t("Open Apple Maps")}
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-white py-3.5 text-base font-semibold text-[var(--mvp-blue)]"
        >
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-[family-name:var(--font-poppins)]">
      <button type="button" className="absolute inset-0" aria-label={t("Close")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-t-[24px] bg-white px-4 pb-8 pt-3 shadow-xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
        <h2 className="mb-4 text-center text-base font-medium text-black">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SheetFooter({
  onClear,
  onApply,
}: {
  onClear: () => void;
  onApply: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onClear}
        className="text-sm font-medium text-black underline-offset-2 hover:underline"
      >
        {t("Clear all")}
      </button>
      <button
        type="button"
        onClick={onApply}
        className="h-[50px] min-w-[122px] rounded-lg bg-[var(--mvp-blue)] px-6 text-base font-semibold text-white"
      >
        {t("Apply")}
      </button>
    </div>
  );
}
