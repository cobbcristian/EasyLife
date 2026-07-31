"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Product = {
  sku: string;
  name: string;
  price: number;
  shelfSlot: string;
  stock: number;
};

function grabConfidence() {
  return 0.9 + Math.random() * 0.09;
}

export function GrabGoKioskClient({ machineCode }: { machineCode: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [machineName, setMachineName] = useState(machineCode);
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<"member_id" | "app_qr" | "card_tap" | "rfid">(
    "rfid",
  );
  const [memberNumber, setMemberNumber] = useState("");
  const [unlockToken, setUnlockToken] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [rfidUid, setRfidUid] = useState("");
  const [communityId, setCommunityId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [items, setItems] = useState<Array<{ sku: string; name: string; qty: number; price: number }>>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraNote, setCameraNote] = useState("");

  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 12));
  }

  useEffect(() => {
    fetch(`/api/grab-go/kiosk?code=${encodeURIComponent(machineCode)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.machine) {
          setMachineName(d.machine.name);
          setLocation(d.machine.location);
          setProducts(d.machine.products ?? []);
          setCommunityId(d.machine.communityId);
        }
      })
      .catch(() => {});
  }, [machineCode]);

  async function unlock() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/grab-go/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open",
        machineCode,
        communityId,
        unlockMethod: mode,
        memberNumber: mode === "member_id" ? memberNumber : undefined,
        unlockToken: mode === "app_qr" ? unlockToken : undefined,
        memberEmail: mode === "card_tap" ? memberEmail : undefined,
        cardLast4: mode === "card_tap" ? "4242" : undefined,
        rfidUid: mode === "rfid" ? rfidUid : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Unlock failed");
      return;
    }
    setSessionId(data.sessionId);
    setMemberName(data.memberName ?? "");
    setItems([]);
    setTotal(0);
    pushLog(data.message ?? "Unlocked");
    pushLog(`Camera tracking ${data.memberName} (${data.memberNumber})`);
  }

  async function visionGrab(sku: string) {
    if (!sessionId) return;
    const res = await fetch("/api/grab-go/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "grab",
        sessionId,
        sku,
        confidence: grabConfidence(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Vision error");
      return;
    }
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    const p = products.find((x) => x.sku === sku);
    pushLog(`📷 Camera: grabbed ${p?.name ?? sku}`);
  }

  async function visionFromNote() {
    if (!sessionId || !cameraNote.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/grab-go/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "vision_note",
        sessionId,
        cameraNote,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Vision match failed");
      pushLog(`Vision note failed: ${data.error ?? "unknown"}`);
      return;
    }
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    const matched = data.matched as { name?: string; confidence?: number } | null;
    pushLog(
      `Vision matched ${matched?.name ?? "item"} (${Math.round((matched?.confidence ?? 0) * 100)}%)`,
    );
    setCameraNote("");
  }

  async function walkOut() {
    if (!sessionId) return;
    setBusy(true);
    const res = await fetch("/api/grab-go/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", sessionId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Settle failed");
      return;
    }
    pushLog(data.message ?? "Settled");
    setSessionId(null);
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
  }

  return (
    <div className="min-h-screen bg-[#0f1419] px-4 py-8 font-[family-name:var(--font-poppins)] text-white">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
          Grab & Go kiosk
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{machineName}</h1>
        <p className="text-sm text-white/60">{location}</p>

        {!sessionId ? (
          <div className="mt-6 space-y-3 rounded-2xl bg-white/5 p-4">
            <p className="text-sm text-white/80">Unlock to open the door</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["rfid", "RFID"],
                  ["member_id", "Member ID"],
                  ["app_qr", "Scan app"],
                  ["card_tap", "Tap card"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`min-w-[72px] flex-1 rounded-xl px-2 py-2 text-xs font-semibold ${
                    mode === id ? "bg-white text-black" : "bg-white/10 text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "rfid" ? (
              <div className="space-y-2">
                <p className="text-xs text-white/50">
                  Hold fob / wristband to the reader (or paste UID for demo)
                </p>
                <input
                  value={rfidUid}
                  onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
                  placeholder="CL-XXXXXXXX"
                  autoFocus
                  className="h-12 w-full rounded-xl border border-white/20 bg-black/30 px-4 text-center text-lg tracking-widest outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void unlock();
                  }}
                />
              </div>
            ) : null}
            {mode === "member_id" ? (
              <input
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                placeholder="Member ID"
                className="h-12 w-full rounded-xl border border-white/20 bg-black/30 px-4 text-center text-lg tracking-widest outline-none"
              />
            ) : null}
            {mode === "app_qr" ? (
              <textarea
                value={unlockToken}
                onChange={(e) => setUnlockToken(e.target.value)}
                placeholder="Paste app unlock token"
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 font-mono text-[11px] outline-none"
              />
            ) : null}
            {mode === "card_tap" ? (
              <div className="space-y-2">
                <p className="text-xs text-white/50">Demo: tap links to member email</p>
                <input
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/20 bg-black/30 px-3 text-sm outline-none"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={unlock}
              className="h-12 w-full rounded-xl bg-emerald-400 text-sm font-bold text-black disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock door"}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4">
              <p className="text-sm font-semibold text-emerald-300">Door open — cameras tracking</p>
              <p className="text-lg font-bold">{memberName}</p>
              <p className="text-xs text-white/60">Grab items below (simulates vision detection)</p>
            </div>

            <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
              {products.map((p) => (
                <li key={p.sku} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[11px] text-white/50">
                      {formatCurrency(p.price)} · Shelf {p.shelfSlot}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => visionGrab(p.sku)}
                    className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    📷 Grab
                  </button>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-white/10 p-4">
              <p className="text-xs font-semibold text-white/70">Vision from camera note</p>
              <input
                value={cameraNote}
                onChange={(e) => setCameraNote(e.target.value)}
                placeholder='e.g. "member took sparkling water"'
                className="mt-2 h-10 w-full rounded-xl border border-white/20 bg-black/30 px-3 text-sm text-white"
              />
              <button
                type="button"
                disabled={busy || !cameraNote.trim()}
                onClick={() => void visionFromNote()}
                className="mt-2 h-10 w-full rounded-xl bg-white/15 text-xs font-semibold disabled:opacity-50"
              >
                Match & grab
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm font-semibold">Basket · {formatCurrency(total)}</p>
              {items.length === 0 ? (
                <p className="mt-1 text-xs text-white/50">Empty — take something or walk out</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-white/80">
                  {items.map((i) => (
                    <li key={i.sku}>
                      {i.qty}× {i.name} — {formatCurrency(i.price * i.qty)}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={walkOut}
                className="mt-4 h-12 w-full rounded-xl bg-white text-sm font-bold text-black disabled:opacity-50"
              >
                Walk out & charge
              </button>
            </div>
          </div>
        )}

        {log.length > 0 ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Event log</p>
            <ul className="mt-2 space-y-1 text-[11px] text-white/55">
              {log.map((line, i) => (
                <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
