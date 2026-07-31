"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Shirt, ShoppingBag } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface ApparelProductDTO {
  id: string;
  vendorName: string;
  name: string;
  description: string;
  price: number;
  sizes: string[];
  category: string;
  imageUrl?: string | null;
}

export interface ApparelOrderDTO {
  id: string;
  vendorName: string;
  orderType: string;
  orderedByName: string;
  items: { name: string; size: string; qty: number; unitPrice: number }[];
  total: number;
  notes: string | null;
  status: string;
  createdAt: string;
}

type CartKey = string;

function cartKey(productId: string, size: string): CartKey {
  return `${productId}::${size}`;
}

const STATUS_VARIANT: Record<string, "info" | "warning" | "success" | "default"> = {
  submitted: "info",
  confirmed: "warning",
  in_production: "warning",
  shipped: "success",
  delivered: "success",
};

interface ApparelShopProps {
  products: ApparelProductDTO[];
  orders: ApparelOrderDTO[];
  vendor: string;
  mode: "club" | "member";
  headerTitle: string;
  avatarName?: string;
  isAdmin?: boolean;
}

export function ApparelShop({
  products,
  orders,
  vendor,
  mode,
  headerTitle,
  avatarName,
  isAdmin = false,
}: ApparelShopProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [cart, setCart] = useState<
    Record<
      CartKey,
      { productId: string; name: string; size: string; qty: number; unitPrice: number }
    >
  >({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => Object.values(cart).reduce((s, line) => s + line.unitPrice * line.qty, 0),
    [cart],
  );

  function addToCart(product: ApparelProductDTO) {
    const size = sizes[product.id] ?? product.sizes[0];
    if (!size) return;
    const key = cartKey(product.id, size);
    setCart((prev) => {
      const existing = prev[key];
      return {
        ...prev,
        [key]: {
          productId: product.id,
          name: product.name,
          size,
          unitPrice: product.price,
          qty: (existing?.qty ?? 0) + 1,
        },
      };
    });
  }

  function adjustQty(key: CartKey, delta: number) {
    setCart((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const qty = line.qty + delta;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...line, qty } };
    });
  }

  async function submitOrder() {
    const items = Object.values(cart);
    if (items.length === 0) {
      toast({ variant: "warning", title: t("Cart is empty") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/apparel/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        notes: notes.trim() || undefined,
        orderType: mode,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not place order") });
      return;
    }
    toast({
      variant: "success",
      title: t("Order submitted"),
      description: t("Vendor will confirm your order shortly."),
    });
    setCart({});
    setNotes("");
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/apparel/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }

  if (mode === "member") {
    return (
      <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
        <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
          <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t(headerTitle)}
            </h1>
            <p className="mt-1 text-[12px] text-grey">
              {t("Ordering from")} <span className="font-semibold text-ink">{vendor}</span>
            </p>
          </header>

          <div className="space-y-6 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">{t("Catalog")}</h2>
              {products.length === 0 ? (
                <div className="rounded-xl bg-[#f7f8fa] p-5 text-center">
                  <p className="text-sm font-semibold text-ink">{t("No apparel listed yet.")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Check back soon, or ask the club what’s in stock.")}
                  </p>
                  <Link
                    href="/member/contact"
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                  >
                    {t("Contact club")}
                  </Link>
                </div>
              ) : (
              <ul className="divide-y divide-[#eceff3]">
                {products.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 py-3.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#f2f4f7]">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Shirt className="h-5 w-5 text-grey" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[15px] font-semibold text-ink">{t(p.name)}</p>
                          <p className="mt-0.5 text-[12px] text-grey">{t(p.description)}</p>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                            {t(p.category)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-ink">
                          {formatCurrency(p.price)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <select
                          value={sizes[p.id] ?? p.sizes[0]}
                          onChange={(e) =>
                            setSizes({ ...sizes, [p.id]: e.target.value })
                          }
                          className="h-10 flex-1 rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
                        >
                          {p.sizes.map((s) => (
                            <option key={s} value={s}>
                              {t(s)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => addToCart(p)}
                          className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("Add")}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
                <ShoppingBag className="h-4 w-4" />
                {t("Order cart")}
              </h2>
              {Object.entries(cart).length === 0 ? (
                <p className="text-sm text-grey">{t("Cart is empty")}</p>
              ) : (
                <ul className="space-y-3">
                  {Object.entries(cart).map(([key, line]) => (
                    <li key={key} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{line.name}</p>
                        <p className="text-[12px] text-grey">
                          {line.size} · {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-white"
                          onClick={() => adjustQty(key, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center">{line.qty}</span>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 hover:bg-white"
                          onClick={() => adjustQty(key, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 border-t border-[#e8ebf0] pt-3">
                <div className="flex justify-between text-sm font-semibold text-ink">
                  <span>{t("Total")}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <button
                  type="button"
                  disabled={busy || total === 0}
                  onClick={submitOrder}
                  className="mt-3 h-12 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? t("Submitting…") : t("Submit order to vendor")}
                </button>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">
                {t("Order history")}
              </h2>
              {orders.length === 0 ? (
                <div className="rounded-xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-grey">{t("No orders yet")}</p>
                  <p className="mt-1 text-[12px] text-grey">
                    {t("Add items to your cart above to place an order.")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
                  {orders.map((o) => (
                    <li key={o.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {formatCurrency(o.total)} · {t("Member order")}
                          </p>
                          <p className="text-[12px] text-grey">
                            {o.orderedByName} · {formatDate(o.createdAt.slice(0, 10))}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold capitalize text-[var(--mvp-blue)]">
                          {t(o.status)}
                        </span>
                      </div>
                      <ul className="mt-1 text-[12px] text-grey">
                        {o.items.map((item, i) => (
                          <li key={i}>
                            {item.qty}× {item.name} ({item.size})
                          </li>
                        ))}
                      </ul>
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

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={headerTitle}
        right={avatarName ? "avatar" : "logo"}
        avatarName={avatarName}
      />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border-1 bg-[var(--mvp-blue)]/10/50 px-4 py-3">
          <Shirt className="h-5 w-5 text-[var(--mvp-blue)]" />
          <p className="text-sm text-ink">
            {t("Ordering from")} <span className="font-semibold">{vendor}</span>
            {` — ${t("Club bulk order")}`}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-bold text-ink">{t("Catalog")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-border-2 bg-white"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Shirt className="h-16 w-16 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-ink">{t(p.name)}</h3>
                        <p className="mt-1 text-xs text-grey">{t(p.description)}</p>
                      </div>
                      <span className="shrink-0 font-bold text-navy">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                    <Badge variant="info" className="mt-2">
                      {t(p.category)}
                    </Badge>
                    <div className="mt-3 flex gap-2">
                      <Select
                        value={sizes[p.id] ?? p.sizes[0]}
                        onChange={(e) => setSizes({ ...sizes, [p.id]: e.target.value })}
                        className="flex-1"
                      >
                        {p.sizes.map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="h-4 w-4" />
                        {t("Add")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border-2 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-black">
                <ShoppingBag className="h-5 w-5" />
                {t("Order cart")}
              </h2>
              <div className="space-y-3">
                {Object.entries(cart).length === 0 ? (
                  <p className="text-sm text-grey">{t("Cart is empty")}</p>
                ) : (
                  Object.entries(cart).map(([key, line]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{line.name}</p>
                        <p className="text-xs text-grey">
                          {line.size} · {formatCurrency(line.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-slate-100"
                          onClick={() => adjustQty(key, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center">{line.qty}</span>
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-slate-100"
                          onClick={() => adjustQty(key, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div className="space-y-2 pt-2">
                  <Label htmlFor="notes">{t("Order notes")}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t("Logo placement, delivery to clubhouse, etc.")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="border-t border-border-2 pt-3">
                  <div className="flex justify-between font-semibold text-ink">
                    <span>{t("Total")}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    disabled={busy || total === 0}
                    onClick={submitOrder}
                  >
                    {busy ? t("Submitting…") : t("Submit order to vendor")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border-2 bg-white p-5">
          <h2 className="mb-4 text-base font-medium text-black">{t("Order history")}</h2>
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl bg-[#f7f8fa] p-4">
                <p className="text-sm text-grey">{t("No orders yet")}</p>
                <p className="mt-1 text-[12px] text-grey">
                  {t("Add items to your cart above to place an order.")}
                </p>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="rounded-lg border border-border-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">
                        {formatCurrency(o.total)} · {t("Club order")}
                      </p>
                      <p className="text-xs text-grey">
                        {o.orderedByName} · {formatDate(o.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    {isAdmin ? (
                      <Select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="w-40"
                      >
                        <option value="submitted">{t("Submitted")}</option>
                        <option value="confirmed">{t("Confirmed")}</option>
                        <option value="in_production">{t("In production")}</option>
                        <option value="shipped">{t("Shipped")}</option>
                        <option value="delivered">{t("Delivered")}</option>
                      </Select>
                    ) : (
                      <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>
                        {t(o.status)}
                      </Badge>
                    )}
                  </div>
                  <ul className="mt-2 text-sm text-grey">
                    {o.items.map((item, i) => (
                      <li key={i}>
                        {item.qty}× {item.name} ({item.size})
                      </li>
                    ))}
                  </ul>
                  {o.notes ? (
                    <p className="mt-2 text-xs text-grey-light">{o.notes}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
