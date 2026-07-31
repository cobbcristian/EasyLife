"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brandAssets, imageForFoodItem } from "@/lib/brand-assets";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { OrderDTO } from "@/lib/member-dtos";
import type { DiningFulfillment } from "@/lib/dining-order";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category?: string;
  restaurantId?: string;
};
type Restaurant = { id: string; name: string; cuisine: string };

type Props = {
  restaurants: Restaurant[];
  menuItems: MenuItem[];
  initialOrders: OrderDTO[];
};

function defaultArriveTime(offsetMinutes = 45): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, "0");
  return `${hh}:${mm}`;
}

function fulfillmentLabel(f: string): string {
  const v = f.toLowerCase();
  if (v === "eat_in" || v === "dine_in") return "Eat-in";
  if (v === "delivery") return "Delivery";
  if (v === "pickup") return "Takeout";
  if (v === "takeout") return "Takeout";
  return f;
}

function assignRestaurantId(
  item: MenuItem,
  restaurants: Restaurant[],
): string {
  if (item.restaurantId) return item.restaurantId;
  if (restaurants.length <= 1) return restaurants[0]?.id ?? "";
  const category = (item.category ?? "").trim();
  const categoryPrefix = category.split("·")[0]?.trim().toLowerCase() ?? "";
  // Seeded menus use "Fine Dining · Dinner", "Grill & Bar · Cocktails", etc.
  if (categoryPrefix) {
    for (const r of restaurants) {
      const rn = r.name.toLowerCase();
      if (categoryPrefix === rn || categoryPrefix.startsWith(rn) || rn.startsWith(categoryPrefix)) {
        return r.id;
      }
    }
  }
  const hay = `${item.name} ${category}`.toLowerCase();
  for (const r of restaurants) {
    const rn = r.name.toLowerCase();
    if (rn.includes("sushi") && /sushi|sashimi|roll|nigiri|tempura/.test(hay)) {
      return r.id;
    }
    if (
      rn.includes("cabana") &&
      /salad|sandwich|burger|wrap|taco|nacho|wings|pool|cabana|lunch/.test(hay)
    ) {
      return r.id;
    }
    if (
      (rn.includes("grille") || rn.includes("grill") || rn.includes("clubhouse")) &&
      /steak|chop|entree|dinner|fish|chicken|pasta|soup|filet|prime/.test(hay)
    ) {
      return r.id;
    }
  }
  let hash = 0;
  for (let i = 0; i < item.id.length; i += 1) hash = (hash + item.id.charCodeAt(i)) % restaurants.length;
  return restaurants[hash]?.id ?? restaurants[0].id;
}

/** Figma-aligned member dining — order ahead eat-in / takeout + recent orders. */
export function MemberMvpDining({ restaurants, menuItems, initialOrders }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState(restaurants[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfillment, setFulfillment] = useState<DiningFulfillment>("eat_in");
  const [address, setAddress] = useState("");
  const [arriveDate, setArriveDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [arriveTime, setArriveTime] = useState(() => defaultArriveTime(45));
  const [partySize, setPartySize] = useState(2);
  const [busy, setBusy] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const restaurantName =
    restaurants.find((r) => r.id === restaurant)?.name ?? "Club restaurant";

  const visibleMenu = useMemo(
    () =>
      menuItems.filter(
        (m) => assignRestaurantId(m, restaurants) === restaurant,
      ),
    [menuItems, restaurant, restaurants],
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const item = menuItems.find((m) => m.id === id);
          return {
            id,
            name: item?.name ?? id,
            qty,
            price: item?.price ?? 0,
            lineTotal: (item?.price ?? 0) * qty,
          };
        }),
    [cart, menuItems],
  );

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);
  const deliveryFee = fulfillment === "delivery" ? 4 : 0;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const upcoming = useMemo(
    () =>
      initialOrders.filter(
        (o) =>
          o.arriveDate &&
          o.arriveTime &&
          !["Cancelled", "Served", "Picked up"].includes(o.status),
      ),
    [initialOrders],
  );

  function add(id: string) {
    setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  }

  async function placeOrder() {
    if (total === 0) {
      toast({ variant: "warning", title: t("Cart is empty") });
      return;
    }
    if (fulfillment === "delivery" && !address.trim()) {
      toast({ variant: "warning", title: t("Add a delivery address") });
      return;
    }
    if (
      (fulfillment === "eat_in" || fulfillment === "takeout") &&
      (!arriveDate || !arriveTime)
    ) {
      toast({ variant: "warning", title: t("Pick arrival date and time") });
      return;
    }
    if (fulfillment === "eat_in" && partySize < 1) {
      toast({ variant: "warning", title: t("Enter party size") });
      return;
    }
    const items = Object.entries(cart).map(([id, qty]) => ({
      name: menuItems.find((m) => m.id === id)?.name ?? id,
      qty,
    }));
    setBusy(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        total: total + deliveryFee,
        fulfillment,
        address: fulfillment === "delivery" ? address : null,
        restaurant: restaurantName,
        arriveDate,
        arriveTime,
        partySize: fulfillment === "eat_in" ? partySize : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      toast({
        variant: "warning",
        title: t("Could not place order"),
        description: err?.error,
      });
      return;
    }
    const data = (await res.json()) as {
      order?: { id?: string; tableLabel?: string | null; readyBy?: string | null };
    };
    setCart({});
    setReviewOpen(false);
    if (data.order?.id) {
      router.push(`/member/orders/${data.order.id}`);
      router.refresh();
      return;
    }
    toast({
      variant: "success",
      title:
        fulfillment === "eat_in"
          ? t("Table held — food timed for you")
          : t("Order placed"),
      description:
        fulfillment === "eat_in"
          ? `${data.order?.tableLabel ?? t("Table reserved")} · ${t("Ready by")} ${data.order?.readyBy ?? arriveTime}`
          : t("Food will be ready at your pickup time."),
    });
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-3xl md:px-6 md:pb-28 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
                {t("Member")}
              </p>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
                {t("Dining")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setReserveOpen(true)}
              className="inline-flex h-10 items-center rounded-full border border-[#e4e8ee] px-4 text-sm font-semibold text-ink"
            >
              {t("Table only")}
            </button>
          </div>
          <p className="mt-1 text-[12px] text-grey">
            {t("Order ahead for eat-in (table + food ready) or takeout pickup.")}
          </p>
        </header>

        <div className="relative mt-0 overflow-hidden md:mt-5 md:rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandAssets.featuredDining}
            alt=""
            className="h-40 w-full object-cover md:h-48"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-lg font-semibold text-white">{restaurantName}</p>
            <p className="text-[12px] text-white/85">
              {restaurants.find((r) => r.id === restaurant)?.cuisine}
            </p>
          </div>
        </div>

        <div className="space-y-5 px-4 py-5 md:rounded-b-2xl md:border md:border-t-0 md:border-[#e8ebf0] md:bg-white md:px-5 md:pb-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {restaurants.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRestaurant(r.id);
                    setCart({});
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold ${
                    restaurant === r.id
                      ? "bg-[var(--mvp-blue)] text-white"
                      : "bg-[#f2f4f7] text-ink"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          ) : null}

          {upcoming.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Coming up")}
              </h2>
              <ul className="mt-2 space-y-2">
                {upcoming.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/member/orders/${o.id}`}
                      className="block rounded-2xl border border-[#e8ebf0] bg-[#f7faf8] px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {o.restaurant ?? restaurantName} · {fulfillmentLabel(o.fulfillment)}
                      </p>
                      <p className="mt-0.5 text-[12px] text-grey">
                        {o.arriveDate} {t("at")} {o.arriveTime}
                        {o.tableLabel ? ` · ${o.tableLabel}` : ""}
                        {o.readyBy ? ` · ${t("Food ready")} ${o.readyBy}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="dining-menu">
            <h2 className="text-[15px] font-semibold text-ink">{t("Order ahead")}</h2>
            <ul className="mt-3 divide-y divide-[#eceff3] pb-28">
              {visibleMenu.length === 0 ? (
                <li className="py-8 text-center">
                  <p className="text-sm text-grey">
                    {t("No menu items for this restaurant yet.")}
                  </p>
                  {restaurants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = restaurants.find((r) => r.id !== restaurant);
                        if (next) {
                          setRestaurant(next.id);
                          setCart({});
                        }
                      }}
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                    >
                      {t("Try another restaurant")} →
                    </button>
                  ) : (
                    <Link
                      href="/member/contact"
                      className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                    >
                      {t("Contact dining")} →
                    </Link>
                  )}
                </li>
              ) : (
                visibleMenu.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageForFoodItem(m.name, m.category)}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{m.name}</p>
                    <p className="text-[12px] text-grey">{formatCurrency(m.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(m.id)}
                    className="inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
                  >
                    {t("Add")}
                    {cart[m.id] ? ` (${cart[m.id]})` : ""}
                  </button>
                </li>
              ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Recent orders")}</h2>
            {initialOrders.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#f7f8fa] p-4 text-center">
                <p className="text-sm font-semibold text-ink">{t("No orders yet.")}</p>
                <p className="mt-1 text-[12px] text-grey">
                  {t("Add items from the menu above to place your first order.")}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("dining-menu")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="mt-3 inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                >
                  {t("Browse menu")}
                </button>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {initialOrders.map((o) => {
                  let itemsLabel = o.items;
                  try {
                    const items = JSON.parse(o.items) as { name: string; qty: number }[];
                    itemsLabel = items.map((i) => `${i.qty}× ${i.name}`).join(", ");
                  } catch {
                    // plain string
                  }
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/member/orders/${o.id}`}
                        className="block rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3"
                      >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {formatCurrency(o.total)}
                        </span>
                        <span className="text-[12px] font-semibold capitalize text-[var(--mvp-blue)]">
                          {o.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-grey">
                        {fulfillmentLabel(o.fulfillment)}
                        {o.tableLabel ? ` · ${o.tableLabel}` : ""}
                        {o.arriveDate ? ` · ${o.arriveDate} ${o.arriveTime ?? ""}` : ""}
                        {" · "}
                        {itemsLabel}
                      </p>
                      <p className="text-[11px] text-grey">{formatDate(o.createdAt)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eceff3] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto max-w-lg space-y-2 md:max-w-3xl">
            <div className="flex rounded-full bg-[#f2f4f7] p-0.5">
              {(
                [
                  ["eat_in", "Eat-in"],
                  ["takeout", "Takeout"],
                  ["delivery", "Delivery"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFulfillment(key)}
                  className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold ${
                    fulfillment === key ? "bg-white text-ink shadow-sm" : "text-grey"
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            {fulfillment === "eat_in" || fulfillment === "takeout" ? (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={arriveDate}
                  onChange={(e) => setArriveDate(e.target.value)}
                  className="h-9 rounded-xl border border-[#e4e8ee] px-2 text-[12px]"
                />
                <input
                  type="time"
                  value={arriveTime}
                  onChange={(e) => setArriveTime(e.target.value)}
                  className="h-9 rounded-xl border border-[#e4e8ee] px-2 text-[12px]"
                />
                {fulfillment === "eat_in" ? (
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value) || 2)}
                    aria-label={t("Party size")}
                    className="h-9 rounded-xl border border-[#e4e8ee] px-2 text-[12px]"
                    placeholder={t("Party")}
                  />
                ) : (
                  <p className="flex h-9 items-center text-[11px] text-grey">
                    {t("Pickup time")}
                  </p>
                )}
              </div>
            ) : null}

            {fulfillment === "eat_in" ? (
              <p className="text-[11px] text-grey">
                {t("We’ll hold a table and time the kitchen so food is ready when you arrive.")}
              </p>
            ) : null}

            {fulfillment === "delivery" ? (
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("Delivery address")}
                className="h-9 w-full rounded-xl border border-[#e4e8ee] px-3 text-[12px] outline-none focus:border-[var(--mvp-blue)]"
              />
            ) : null}

            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 text-[12px] text-grey">
                {cartCount} {t("items")} · {formatCurrency(total + deliveryFee)}
              </p>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                disabled={busy}
                className="h-12 shrink-0 rounded-2xl bg-[var(--mvp-blue)] px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("Review order")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6">
          <button
            type="button"
            aria-label={t("Close")}
            className="absolute inset-0"
            onClick={() => setReviewOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl md:rounded-3xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#d8dde5] md:hidden" />
            <h2 className="text-lg font-semibold text-ink">{t("Order Review")}</h2>
            <p className="mt-1 text-sm text-grey">
              {restaurantName} · {fulfillmentLabel(fulfillment)}
            </p>
            <ul className="mt-4 divide-y divide-[#eceff3]">
              {cartLines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{line.name}</p>
                    <p className="text-[12px] text-grey">
                      {line.qty} × {formatCurrency(line.price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    {formatCurrency(line.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            {deliveryFee > 0 ? (
              <p className="mt-2 flex justify-between text-sm text-grey">
                <span>{t("Delivery fee")}</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </p>
            ) : null}
            <p className="mt-3 flex justify-between text-[15px] font-semibold text-ink">
              <span>{t("Total")}</span>
              <span>{formatCurrency(total + deliveryFee)}</span>
            </p>
            <p className="mt-2 text-[12px] text-grey">
              {fulfillment === "delivery"
                ? address
                : `${arriveDate} · ${arriveTime}${fulfillment === "eat_in" ? ` · ${t("Party")} ${partySize}` : ""}`}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="h-12 flex-1 rounded-2xl text-sm font-semibold text-grey"
              >
                {t("Back")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void placeOrder()}
                className="h-12 flex-[1.4] rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? t("Placing...")
                  : fulfillment === "eat_in"
                    ? t("Reserve & order")
                    : t("Place order")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reserveOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6">
          <button
            type="button"
            aria-label={t("Close")}
            className="absolute inset-0"
            onClick={() => setReserveOpen(false)}
          />
          <form
            className="relative z-10 w-full max-w-lg space-y-4 rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl md:rounded-3xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              const res = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  restaurant: restaurantName,
                  date: String(fd.get("date")),
                  time: String(fd.get("time")),
                  partySize: Number(fd.get("party")),
                }),
              });
              setBusy(false);
              if (!res.ok) {
                toast({ variant: "warning", title: t("Could not reserve") });
                return;
              }
              toast({
                variant: "success",
                title: t("Table reserved"),
                description: t("Order ahead separately if you want food ready on arrival."),
              });
              setReserveOpen(false);
              router.refresh();
            }}
          >
            <div className="flex justify-center md:hidden">
              <span className="h-1.5 w-12 rounded-full bg-[#d8dde5]" />
            </div>
            <h2 className="text-lg font-semibold text-ink">{t("Reserve a table only")}</h2>
            <p className="text-sm text-grey">
              {t("Prefer food ready too? Use Eat-in checkout with your cart.")}
            </p>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-grey">
                {t("Restaurant")}
              </span>
              <select
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Date")}
                </span>
                <input
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="h-11 w-full rounded-xl border border-[#e4e8ee] px-2 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Time")}
                </span>
                <input
                  name="time"
                  type="time"
                  defaultValue="19:00"
                  className="h-11 w-full rounded-xl border border-[#e4e8ee] px-2 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Party")}
                </span>
                <input
                  name="party"
                  type="number"
                  defaultValue={2}
                  min={1}
                  className="h-11 w-full rounded-xl border border-[#e4e8ee] px-2 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setReserveOpen(false)}
                className="h-12 flex-1 rounded-2xl text-sm font-semibold text-grey"
              >
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-12 flex-[1.4] rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {t("Reserve table")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <MemberMvpBottomNav />
    </div>
  );
}
