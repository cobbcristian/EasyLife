"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Product = {
  sku: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  shelfSlot: string;
};

type Machine = {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  products: Product[];
};

type Visit = {
  id: string;
  machineName: string;
  location: string;
  status: string;
  total: number;
  unlockMethod: string;
  unlockedAt: string;
  closedAt: string | null;
  items: Array<{ name: string; qty: number; price: number }>;
};

export function GrabGoMemberClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [memberNumber, setMemberNumber] = useState("");
  const [rfidUid, setRfidUid] = useState<string | null>(null);
  const [rfidInput, setRfidInput] = useState("");
  const [unlockToken, setUnlockToken] = useState("");
  const [selected, setSelected] = useState<Machine | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return fetch("/api/grab-go")
      .then((r) => r.json())
      .then((d) => {
        setMachines(d.machines ?? []);
        setVisits(d.visits ?? []);
        setMemberNumber(d.memberNumber ?? "");
        setRfidUid(d.rfidUid ?? null);
        setUnlockToken(d.unlockToken ?? "");
        setSelected((prev) => prev ?? d.machines?.[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addToCart(sku: string) {
    setCart((c) => ({ ...c, [sku]: (c[sku] ?? 0) + 1 }));
  }

  async function unlockStand() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch("/api/grab-go", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineCode: selected.code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      toast({ variant: "warning", title: data.error ?? t("Could not unlock") });
      return;
    }

    const lines = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([sku, qty]) => ({ sku, qty }));

    if (lines.length > 0) {
      await fetch("/api/grab-go/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "declare",
          sessionId: data.sessionId,
          lines,
        }),
      });
    }
    setBusy(false);
    setCart({});
    toast({
      variant: "success",
      title: t("Stand unlocked"),
      description: t("Cameras are on — grab snacks and walk out. Charged to your club account."),
    });
    load();
  }

  async function refreshToken() {
    const res = await fetch("/api/grab-go", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh_token" }),
    });
    const data = await res.json();
    if (data.unlockToken) setUnlockToken(data.unlockToken);
    if (data.memberNumber) setMemberNumber(data.memberNumber);
    if (data.rfidUid !== undefined) setRfidUid(data.rfidUid);
    toast({ variant: "success", title: t("QR code refreshed") });
  }

  async function issueRfid() {
    setBusy(true);
    const res = await fetch("/api/grab-go", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue_rfid" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not issue RFID") });
      return;
    }
    setRfidUid(data.rfidUid ?? null);
    toast({
      variant: "success",
      title: t("RFID fob ready"),
      description: data.rfidUid,
    });
  }

  async function linkRfid() {
    if (!rfidInput.trim()) return;
    setBusy(true);
    const res = await fetch("/api/grab-go", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "link_rfid", rfidUid: rfidInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not link RFID") });
      return;
    }
    setRfidUid(data.rfidUid ?? null);
    setRfidInput("");
    toast({ variant: "success", title: t("RFID linked"), description: data.rfidUid });
  }

  if (loading) {
    return <p className="p-6 text-sm text-grey">{t("Loading…")}</p>;
  }

  const cartTotal = selected
    ? Object.entries(cart).reduce((sum, [sku, qty]) => {
        const p = selected.products.find((x) => x.sku === sku);
        return sum + (p ? p.price * qty : 0);
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          {t("Member")}
        </p>
        <h1 className="text-[22px] font-semibold">{t("Grab & Go")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t(
            "Cashierless snacks — unlock with RFID, the app, tap your card, or member ID. Cameras see what you take.",
          )}
        </p>

        <section className="mt-5 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
          <h2 className="text-[15px] font-semibold">{t("Your unlock codes")}</h2>
          <p className="mt-2 text-xs text-grey">{t("RFID fob / wristband")}</p>
          {rfidUid ? (
            <p className="text-lg font-bold tracking-widest text-[var(--mvp-blue)]">
              {rfidUid}
            </p>
          ) : (
            <p className="text-sm text-grey">{t("No fob linked yet")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void issueRfid()}
              className="rounded-lg bg-[var(--mvp-blue)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {rfidUid ? t("Reissue fob") : t("Issue RFID fob")}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={rfidInput}
              onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
              placeholder={t("Or paste reader UID")}
              className="h-9 flex-1 rounded-lg border border-[#dfe3ea] px-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
            />
            <button
              type="button"
              disabled={busy || !rfidInput.trim()}
              onClick={() => void linkRfid()}
              className="rounded-lg border border-[#dfe3ea] px-3 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {t("Link")}
            </button>
          </div>
          <p className="mt-3 text-xs text-grey">{t("Member ID (enter at the machine)")}</p>
          <p className="text-lg font-bold tracking-widest text-[var(--mvp-blue)]">{memberNumber}</p>
          <p className="mt-3 text-xs text-grey">{t("App QR / scan token (15 min)")}</p>
          <p className="break-all font-mono text-[11px] text-ink">{unlockToken.slice(0, 48)}…</p>
          <button
            type="button"
            onClick={refreshToken}
            className="mt-3 text-sm font-semibold text-[var(--mvp-blue)]"
          >
            {t("Refresh code")}
          </button>
          <p className="mt-3 text-[11px] text-grey">
            {t("Or open the kiosk demo")}:{" "}
            {selected ? (
              <Link
                className="font-semibold text-[var(--mvp-blue)]"
                href={`/grab-go/kiosk/${encodeURIComponent(selected.code)}`}
              >
                /grab-go/kiosk/{selected.code}
              </Link>
            ) : (
              <span className="text-grey">{t("No stand linked yet")}</span>
            )}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">{t("Stands")}</h2>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {machines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelected(m);
                  setCart({});
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm ${
                  selected?.id === m.id
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f2f4f7] text-ink"
                }`}
              >
                <span className="block font-semibold">{m.name}</span>
                <span className="block text-[11px] opacity-80">{m.location}</span>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="mt-5">
            <h2 className="text-[15px] font-semibold">{t("Menu")} — {selected.name}</h2>
            <p className="text-xs text-grey">
              {t("Optional: tap what you’ll grab before unlocking. The camera still confirms.")}
            </p>
            <ul className="mt-3 divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
              {selected.products.map((p) => (
                <li key={p.sku} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-[11px] text-grey">
                      {formatCurrency(p.price)} · {t("Shelf")} {p.shelfSlot} · {p.stock} {t("left")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(p.sku)}
                    className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[var(--mvp-blue)]"
                  >
                    +{cart[p.sku] ? ` ${cart[p.sku]}` : ""}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={busy || selected.status !== "online"}
              onClick={unlockStand}
              className="mt-4 h-12 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy
                ? t("Unlocking…")
                : cartTotal > 0
                  ? `${t("Unlock & grab")} · ${formatCurrency(cartTotal)}`
                  : t("Unlock stand")}
            </button>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-[15px] font-semibold">{t("Recent visits")}</h2>
          <ul className="mt-2 divide-y divide-[#eceff3]">
            {visits.length === 0 ? (
              <li className="rounded-xl bg-[#f7f8fa] px-4 py-5 text-center">
                <p className="text-sm font-semibold text-ink">{t("No grab-and-go visits yet.")}</p>
                <p className="mt-1 text-sm text-grey">
                  {t("Unlock a stand above to start your first visit.")}
                </p>
                {selected ? (
                  <Link
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    href={`/grab-go/kiosk/${encodeURIComponent(selected.code)}`}
                  >
                    {t("Open kiosk demo")}
                  </Link>
                ) : null}
              </li>
            ) : (
              visits.map((v) => (
                <li key={v.id} className="py-3">
                  <p className="text-sm font-medium text-ink">{v.machineName}</p>
                  <p className="text-xs text-grey">
                    {formatDate(v.unlockedAt.slice(0, 10))} · {v.unlockMethod.replace(/_/g, " ")} ·{" "}
                    {v.status}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--mvp-blue)]">
                    {formatCurrency(v.total)}
                    {Array.isArray(v.items) && v.items.length
                      ? ` · ${v.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}`
                      : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
