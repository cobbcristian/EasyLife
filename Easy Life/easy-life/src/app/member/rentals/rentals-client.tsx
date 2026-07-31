"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { rentalUnitLabel, type RentalItem } from "@/lib/member-data";
import {
  IRON_LAKE_GOLF_CLUBS_ITEM_ID,
  todayIsoDate,
  type FlexAvailability,
  type GolfClubFlex,
} from "@/lib/rental-flex";

export interface RentalDTO {
  id: string;
  item: string;
  days: number;
  total: number;
  status: string;
  flex?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type FlexAvailabilityDTO = FlexAvailability;

export function RentalsClient({
  initial,
  rentalItems,
  initialFlexAvailability = null,
  pageTitle = "Equipment Rental",
  pageSubtitle,
}: {
  initial: RentalDTO[];
  avatarName?: string;
  rentalItems: RentalItem[];
  initialFlexAvailability?: FlexAvailabilityDTO[] | null;
  pageTitle?: string;
  pageSubtitle?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [flexByItem, setFlexByItem] = useState<Record<string, GolfClubFlex>>({});
  const [startByItem, setStartByItem] = useState<Record<string, string>>({});
  const [flexAvailability, setFlexAvailability] = useState<FlexAvailabilityDTO[] | null>(
    initialFlexAvailability,
  );

  const categories = useMemo(() => {
    const order: string[] = [];
    for (const item of rentalItems) {
      if (!order.includes(item.category)) order.push(item.category);
    }
    return order;
  }, [rentalItems]);

  const golfClubs = rentalItems.find((i) => i.id === IRON_LAKE_GOLF_CLUBS_ITEM_ID);

  function qtyFor(item: RentalItem) {
    return qtyByItem[item.id] ?? 1;
  }

  function setQty(item: RentalItem, next: number) {
    const max =
      item.pricingUnit === "hour" ? 12 : item.pricingUnit === "night" ? 7 : 5;
    setQtyByItem((prev) => ({
      ...prev,
      [item.id]: Math.min(max, Math.max(1, next)),
    }));
  }

  function startFor(item: RentalItem) {
    return startByItem[item.id] ?? todayIsoDate();
  }

  function flexFor(item: RentalItem): GolfClubFlex | "" {
    if (!item.flexOptions?.length) return "";
    return flexByItem[item.id] ?? item.flexOptions[0].flex;
  }

  function remainingForFlex(flex: string): number | null {
    if (!flexAvailability) return null;
    const row = flexAvailability.find((a) => a.flex === flex);
    return row ? row.remaining : null;
  }

  useEffect(() => {
    if (!golfClubs?.flexOptions?.length) return;
    const startDate = startFor(golfClubs);
    const days = qtyFor(golfClubs);
    let cancelled = false;
    const params = new URLSearchParams({
      itemId: golfClubs.id,
      startDate,
      days: String(days),
    });
    void fetch(`/api/rentals?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { availability?: FlexAvailabilityDTO[] | null };
        if (!cancelled && data.availability) setFlexAvailability(data.availability);
      })
      .catch(() => {
        /* keep SSR availability */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when golf start/days change
  }, [golfClubs?.id, startByItem[IRON_LAKE_GOLF_CLUBS_ITEM_ID], qtyByItem[IRON_LAKE_GOLF_CLUBS_ITEM_ID]]);

  async function rent(itemId: string) {
    const item = rentalItems.find((r) => r.id === itemId);
    if (!item) return;
    const units = qtyFor(item);
    const unit = rentalUnitLabel(item);
    const flex = item.flexOptions?.length ? flexFor(item) : undefined;
    if (item.flexOptions?.length && !flex) {
      toast({ variant: "warning", title: t("Choose a shaft flex") });
      return;
    }
    if (flex) {
      const remaining = remainingForFlex(flex);
      if (remaining === 0) {
        toast({
          variant: "warning",
          title: t("Unavailable"),
          description: t(`No ${flex} flex sets left for those dates.`),
        });
        return;
      }
    }
    setBusy(itemId);
    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: item.name,
        itemId: item.id,
        days: units,
        total: item.pricePerDay * units,
        flex: flex || undefined,
        startDate: item.flexOptions?.length ? startFor(item) : undefined,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      let message = t("Could not reserve");
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        /* ignore */
      }
      toast({ variant: "warning", title: message });
      return;
    }
    toast({
      variant: "success",
      title: t("Reserved"),
      description: t(
        flex
          ? `${item.name} (${flex} flex) reserved for ${units} ${unit}${units === 1 ? "" : "s"}.`
          : `${item.name} reserved for ${units} ${unit}${units === 1 ? "" : "s"}.`,
      ),
    });
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t(pageTitle)}
          </h1>
          {pageSubtitle ? (
            <p className="mt-1 text-[13px] text-grey">{t(pageSubtitle)}</p>
          ) : null}
        </header>

        <div
          id="rental-catalog"
          className="space-y-6 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]"
        >
          {categories.map((category) => {
            const items = rentalItems.filter((i) => i.category === category);
            return (
              <section key={category}>
                <h2 className="mb-2 text-[15px] font-semibold text-ink">{t(category)}</h2>
                <ul className="divide-y divide-[#eceff3]">
                  {items.map((item) => {
                    const unit = rentalUnitLabel(item);
                    const units = qtyFor(item);
                    const hasFlex = Boolean(item.flexOptions?.length);
                    const selectedFlex = flexFor(item);
                    const remaining =
                      hasFlex && selectedFlex ? remainingForFlex(selectedFlex) : null;
                    const soldOut = hasFlex && remaining === 0;
                    return (
                      <li key={item.id} className="flex flex-col gap-3 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br ${item.color}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-ink">{item.name}</p>
                            <p className="mt-0.5 text-[12px] text-grey">
                              {formatCurrency(item.pricePerDay)}/{unit}
                              {hasFlex
                                ? ` · ${item.available} ${t("sets in inventory")}`
                                : ` · ${item.available} ${t("available")}`}
                            </p>
                            {item.note ? (
                              <p className="mt-1 text-[11px] leading-snug text-grey">{t(item.note)}</p>
                            ) : null}
                          </div>
                        </div>

                        {hasFlex && item.flexOptions ? (
                          <div className="space-y-2 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-grey">
                              {t("Shaft flex")}
                            </label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {item.flexOptions.map((opt) => {
                                const rem = remainingForFlex(opt.flex);
                                const selected = selectedFlex === opt.flex;
                                const noneLeft = rem === 0;
                                return (
                                  <button
                                    key={opt.flex}
                                    type="button"
                                    disabled={noneLeft}
                                    onClick={() =>
                                      setFlexByItem((prev) => ({
                                        ...prev,
                                        [item.id]: opt.flex,
                                      }))
                                    }
                                    className={
                                      selected
                                        ? "rounded-xl border border-[var(--mvp-blue)] bg-white px-2 py-2 text-left disabled:opacity-40"
                                        : "rounded-xl border border-[#e4e8ee] bg-white px-2 py-2 text-left disabled:opacity-40"
                                    }
                                  >
                                    <span className="block text-[13px] font-semibold text-ink">
                                      {opt.flex}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-grey">
                                      {rem == null
                                        ? `${opt.inventory} ${t("sets")}`
                                        : noneLeft
                                          ? t("Unavailable")
                                          : `${rem} ${t("left")}`}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex flex-wrap items-end gap-2 pt-1">
                              <div className="min-w-[9rem] flex-1">
                                <label
                                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-grey"
                                  htmlFor={`start-${item.id}`}
                                >
                                  {t("Start date")}
                                </label>
                                <input
                                  id={`start-${item.id}`}
                                  type="date"
                                  value={startFor(item)}
                                  onChange={(e) =>
                                    setStartByItem((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="h-9 w-full rounded-full border border-[#e8ebf0] bg-white px-3 text-[12px] font-medium text-ink"
                                />
                              </div>
                              <div>
                                <label
                                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-grey"
                                  htmlFor={`qty-${item.id}`}
                                >
                                  {t("Days")}
                                </label>
                                <select
                                  id={`qty-${item.id}`}
                                  value={units}
                                  onChange={(e) => setQty(item, Number(e.target.value))}
                                  className="h-9 rounded-full border border-[#e8ebf0] bg-white px-2 text-[12px] font-medium text-ink"
                                >
                                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                      {n} {unit}
                                      {n === 1 ? "" : "s"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                disabled={busy === item.id || soldOut}
                                onClick={() => rent(item.id)}
                                className="ml-auto inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                              >
                                {busy === item.id
                                  ? t("Reserving...")
                                  : soldOut
                                    ? t("Unavailable")
                                    : formatCurrency(item.pricePerDay * units)}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                            <label className="sr-only" htmlFor={`qty-${item.id}`}>
                              {unit}s
                            </label>
                            <select
                              id={`qty-${item.id}`}
                              value={units}
                              onChange={(e) => setQty(item, Number(e.target.value))}
                              className="h-9 rounded-full border border-[#e8ebf0] bg-white px-2 text-[12px] font-medium text-ink"
                            >
                              {Array.from(
                                {
                                  length:
                                    item.pricingUnit === "hour"
                                      ? 12
                                      : item.pricingUnit === "night"
                                        ? 7
                                        : 5,
                                },
                                (_, i) => i + 1,
                              ).map((n) => (
                                <option key={n} value={n}>
                                  {n} {unit}
                                  {n === 1 ? "" : "s"}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={busy === item.id}
                              onClick={() => rent(item.id)}
                              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                            >
                              {busy === item.id
                                ? t("Reserving...")
                                : formatCurrency(item.pricePerDay * units)}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink">{t("My Reservations")}</h2>
            {initial.length === 0 ? (
              <div className="rounded-xl bg-[#f7f8fa] p-4 text-center">
                <p className="text-sm text-grey">{t("No active reservations yet.")}</p>
                <p className="mt-1 text-[12px] text-grey">
                  {t("Pick an item above to reserve for your stay.")}
                </p>
                <a
                  href="#rental-catalog"
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                >
                  {t("Browse rentals")}
                </a>
              </div>
            ) : (
              <ul className="divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0] bg-[#fafbfc]">
                {initial.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{r.item}</p>
                      <p className="text-[12px] text-grey">
                        {r.startDate && r.endDate
                          ? `${r.startDate} → ${r.endDate} · ${r.status}`
                          : `${r.days} · ${r.status}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-ink">
                      {formatCurrency(r.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
