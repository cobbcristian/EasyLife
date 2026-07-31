"use client";

import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

export interface NewServicePayload {
  name: string;
  price: string;
  description: string;
  image: string;
}

const TIME_SLOT_OPTIONS = ["15 minutes", "30 minutes", "60 minutes", "90 minutes"] as const;
const TIME_CAP_OPTIONS = ["1 hour", "2 hours", "3 hours", "4 hours"] as const;
const OPEN_PERIOD_OPTIONS = ["7 days", "14 days", "30 days", "60 days"] as const;

const SETTINGS_MARKER = "\n\n— Settings —\n";

function parseActivitySettings(description: string): {
  body: string;
  timeSlot: string;
  timeCap: string;
  openPeriod: string;
} {
  const idx = description.indexOf(SETTINGS_MARKER);
  if (idx < 0) {
    return {
      body: description,
      timeSlot: TIME_SLOT_OPTIONS[1],
      timeCap: TIME_CAP_OPTIONS[1],
      openPeriod: OPEN_PERIOD_OPTIONS[1],
    };
  }
  const body = description.slice(0, idx).trim();
  const block = description.slice(idx + SETTINGS_MARKER.length);
  const timeSlot =
    TIME_SLOT_OPTIONS.find((o) => block.includes(`Time slot increment: ${o}`)) ??
    TIME_SLOT_OPTIONS[1];
  const timeCap =
    TIME_CAP_OPTIONS.find((o) => block.includes(`Reservation time cap: ${o}`)) ??
    TIME_CAP_OPTIONS[1];
  const openPeriod =
    OPEN_PERIOD_OPTIONS.find((o) => block.includes(`Open reservation period: ${o}`)) ??
    OPEN_PERIOD_OPTIONS[1];
  return { body, timeSlot, timeCap, openPeriod };
}

function encodeActivitySettings(
  body: string,
  timeSlot: string,
  timeCap: string,
  openPeriod: string,
) {
  return `${body.trim()}${SETTINGS_MARKER}Time slot increment: ${timeSlot}\nReservation time cap: ${timeCap}\nOpen reservation period: ${openPeriod}`;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-6 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Add New Service / Edit Service + Activity sheet (4616:15016, 5692:21312, 4703:9244). */
export function ProviderAddServiceSheet({
  open,
  onClose,
  onSave,
  onDelete,
  title,
  initial,
  kind = "service",
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: NewServicePayload) => void;
  onDelete?: () => void;
  title?: string;
  initial?: NewServicePayload;
  /** Activity form adds Figma time-slot / reservation fields. */
  kind?: "service" | "activity";
}) {
  const { t } = useI18n();
  const isActivity = kind === "activity";
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string>(brandAssets.bookingThumbCleaning);
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOT_OPTIONS[1]);
  const [timeCap, setTimeCap] = useState<string>(TIME_CAP_OPTIONS[1]);
  const [openPeriod, setOpenPeriod] = useState<string>(OPEN_PERIOD_OPTIONS[1]);

  const formKey = open
    ? `${isActivity ? "activity" : "service"}|${initial?.name ?? ""}|${initial?.price ?? ""}|${initial?.description ?? ""}|${initial?.image ?? ""}`
    : "closed";
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    if (open) {
      if (initial) {
        if (isActivity) {
          const parsed = parseActivitySettings(initial.description);
          setName(initial.name);
          setPrice(initial.price);
          setDescription(parsed.body);
          setImage(initial.image || brandAssets.serviceCourt);
          setTimeSlot(parsed.timeSlot);
          setTimeCap(parsed.timeCap);
          setOpenPeriod(parsed.openPeriod);
        } else {
          setName(initial.name);
          setPrice(initial.price);
          setDescription(initial.description);
          setImage(initial.image);
        }
      } else {
        setName("");
        setPrice("");
        setDescription("");
        setImage("");
        // Empty activity sheet matches Figma skeleton: selects show label placeholders.
        setTimeSlot("");
        setTimeCap("");
        setOpenPeriod("");
      }
    }
  }

  if (!open) return null;

  function handleSave() {
    if (!name.trim()) return;
    const desc = isActivity
      ? encodeActivitySettings(
          description,
          timeSlot || TIME_SLOT_OPTIONS[1],
          timeCap || TIME_CAP_OPTIONS[1],
          openPeriod || OPEN_PERIOD_OPTIONS[1],
        )
      : description.trim();
    onSave({
      name: name.trim(),
      price: price.trim(),
      description: desc,
      image:
        image ||
        (isActivity ? brandAssets.serviceCourt : brandAssets.bookingThumbCleaning),
    });
    onClose();
  }

  const coverChoices = isActivity
    ? [brandAssets.serviceCourt, brandAssets.activityBike]
    : [brandAssets.bookingThumbCleaning, brandAssets.bookingThumbCarpet];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-[family-name:var(--font-poppins)]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-service-title"
        className="relative flex max-h-[90vh] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <span className="w-10" aria-hidden />
          <h2 id="add-service-title" className="text-lg font-semibold text-black">
            {title ?? (isActivity ? t("Add New Activity") : t("Add New Service"))}
          </h2>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="text-sm font-semibold text-[var(--mvp-blue)] disabled:opacity-40"
          >
            {t("Save")}
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-10 py-8 sm:px-24">
          <div className="relative mx-auto flex h-[200px] w-[200px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border-2 bg-white">
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-lg text-white">
                  +
                </span>
              </>
            ) : (
              <>
                <Plus className="h-8 w-8 text-grey-light" strokeWidth={1.5} />
                <p className="mt-2 text-sm text-grey">{t("Cover Photo")}</p>
              </>
            )}
          </div>
          {image ? (
            <p className="-mt-2 text-center text-sm text-grey">{t("Cover Photo")}</p>
          ) : null}
          <div className="flex justify-center gap-2">
            {coverChoices.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setImage(src)}
                className={cn(
                  "h-12 w-12 overflow-hidden rounded-lg border-2",
                  image === src ? "border-[var(--mvp-blue)]" : "border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <input
            className={fieldClass}
            placeholder={isActivity ? t("Activity Name") : t("Service Name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={fieldClass}
            placeholder={
              isActivity
                ? t("Price (leave blank if free)")
                : t("Price (leave blank if estimate)")
            }
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <textarea
            className="min-h-[100px] w-full resize-none rounded-lg border border-border-2 px-6 py-4 text-[15px] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            placeholder={t("Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {isActivity ? (
            <>
              <label className="relative block">
                <span className="sr-only">{t("Time Slot Increment")}</span>
                <select
                  className={cn(
                    fieldClass,
                    "appearance-none pr-10",
                    !timeSlot && "text-grey",
                  )}
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  aria-label={t("Time Slot Increment")}
                >
                  <option value="">{t("Time Slot Increment")}</option>
                  {TIME_SLOT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
              </label>
              <label className="relative block">
                <span className="sr-only">{t("Reservation Time Cap")}</span>
                <select
                  className={cn(
                    fieldClass,
                    "appearance-none pr-10",
                    !timeCap && "text-grey",
                  )}
                  value={timeCap}
                  onChange={(e) => setTimeCap(e.target.value)}
                  aria-label={t("Reservation Time Cap")}
                >
                  <option value="">{t("Reservation Time Cap")}</option>
                  {TIME_CAP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
              </label>
              <label className="relative block">
                <span className="sr-only">{t("Open Reservation Period")}</span>
                <select
                  className={cn(
                    fieldClass,
                    "appearance-none pr-10",
                    !openPeriod && "text-grey",
                  )}
                  value={openPeriod}
                  onChange={(e) => setOpenPeriod(e.target.value)}
                  aria-label={t("Open Reservation Period")}
                >
                  <option value="">{t("Open Reservation Period")}</option>
                  {OPEN_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
              </label>
            </>
          ) : null}

          <button
            type="button"
            onClick={onDelete}
            disabled={!onDelete}
            className={cn(
              "flex h-[50px] w-full items-center justify-center rounded-lg text-base font-semibold",
              onDelete
                ? "bg-[#f2f2f7] text-[#ff3b30] hover:bg-[#e9e9ee]"
                : "cursor-not-allowed bg-[#f2f2f7] text-white",
            )}
          >
            {t("Delete")}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-grey hover:bg-slate-100 lg:hidden"
          aria-label={t("Close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function AddServiceTrigger({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)]/10 px-3 text-sm font-semibold text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/15"
    >
      <Plus className="h-4 w-4" />
      {label ?? t("Add service")}
    </button>
  );
}
