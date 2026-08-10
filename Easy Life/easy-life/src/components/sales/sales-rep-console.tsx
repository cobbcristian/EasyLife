"use client";

import { useEffect, useMemo, useState } from "react";

type Line = {
  id: string;
  amount: number;
  level: number;
  status: string;
  createdAt: string;
  eventType: string;
  communityName: string;
  salespersonName: string;
};

type Person = {
  id: string;
  name: string;
  email: string;
  parentId: string | null;
};

export function SalesRepConsole() {
  const [lines, setLines] = useState<Line[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [downline, setDownline] = useState(true);
  const [hire, setHire] = useState({
    name: "",
    email: "",
    password: "password",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    const [commRes, salesRes] = await Promise.all([
      fetch(`/api/sales/commissions?downline=${downline ? "1" : "0"}`),
      fetch("/api/sales"),
    ]);
    if (commRes.ok) {
      const d = await commRes.json();
      setLines(d.lines ?? []);
    }
    if (salesRes.ok) {
      const d = await salesRes.json();
      setPeople(d.people ?? []);
    }
  }

  useEffect(() => {
    void reload();
  }, [downline]);

  const totals = useMemo(() => {
    const pending = lines
      .filter((l) => l.status !== "paid")
      .reduce((s, l) => s + l.amount, 0);
    const paid = lines
      .filter((l) => l.status === "paid")
      .reduce((s, l) => s + l.amount, 0);
    return { pending, paid };
  }, [lines]);

  async function hireDownline() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "hire",
        ...hire,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not hire");
      return;
    }
    setMessage(`Hired ${hire.name}`);
    setHire({ name: "", email: "", password: "password" });
    await reload();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sales desk</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your commissions, downline, and community assignments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pending</p>
          <p className="mt-1 text-2xl font-semibold">${totals.pending.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Paid</p>
          <p className="mt-1 text-2xl font-semibold">${totals.paid.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Hire downline</h2>
          <p className="mt-1 text-xs text-slate-500">
            When they close a club or earn residuals, you get an override.
          </p>
          <div className="mt-3 space-y-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Name"
              value={hire.name}
              onChange={(e) => setHire((h) => ({ ...h, name: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Email"
              value={hire.email}
              onChange={(e) => setHire((h) => ({ ...h, email: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Temp password"
              value={hire.password}
              onChange={(e) =>
                setHire((h) => ({ ...h, password: e.target.value }))
              }
            />
            <button
              type="button"
              onClick={() => void hireDownline()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Hire
            </button>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {people.map((p) => (
              <li key={p.id} className="py-2 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-slate-500"> · {p.email}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Commission lines</h2>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={downline}
                onChange={(e) => setDownline(e.target.checked)}
              />
              Include downline
            </label>
          </div>
          <ul className="mt-3 max-h-96 overflow-auto divide-y divide-slate-100">
            {lines.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">${l.amount.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">{l.status}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {l.communityName} · {l.eventType} · L{l.level} ·{" "}
                  {l.salespersonName}
                </div>
              </li>
            ))}
            {lines.length === 0 ? (
              <li className="py-6 text-sm text-slate-400">No commissions yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
