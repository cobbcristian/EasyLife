"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  userId: string;
  email: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  status: string;
  hireable: boolean;
  activeAssignments: number;
};

type Assignment = {
  id: string;
  communityId: string;
  communityName: string;
  salespersonId: string;
  salespersonName: string;
  role: string;
  startedAt: string;
  endedAt: string | null;
  reason: string | null;
};

type Line = {
  id: string;
  amount: number;
  level: number;
  status: string;
  createdAt: string;
  eventType: string;
  communityId: string;
  communityName: string;
  amountGross: number;
  salespersonId: string;
  salespersonName: string;
};

type CommunityOpt = { id: string; name: string };

export function SalesAdminConsole() {
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [communities, setCommunities] = useState<CommunityOpt[]>([]);
  const [tab, setTab] = useState<"people" | "assign" | "commissions">("people");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "password",
    parentId: "",
  });
  const [assignForm, setAssignForm] = useState({
    communityId: "",
    salespersonId: "",
    reason: "",
  });
  const [contractForm, setContractForm] = useState({
    communityId: "",
    contractValueUsd: "10000",
  });

  async function reload() {
    const [salesRes, commRes, communitiesRes] = await Promise.all([
      fetch("/api/sales"),
      fetch("/api/sales/commissions"),
      fetch("/api/communities"),
    ]);
    if (salesRes.ok) {
      const d = await salesRes.json();
      setPeople(d.people ?? []);
      setAssignments(d.assignments ?? []);
    }
    if (commRes.ok) {
      const d = await commRes.json();
      setLines(d.lines ?? []);
    }
    if (communitiesRes.ok) {
      const d = await communitiesRes.json();
      const list = Array.isArray(d) ? d : d.communities ?? [];
      setCommunities(
        list.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })),
      );
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const activeOwners = useMemo(
    () => assignments.filter((a) => a.role === "owner" && !a.endedAt),
    [assignments],
  );

  async function createPerson() {
    setError(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        email: form.email,
        name: form.name,
        password: form.password,
        parentId: form.parentId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to create");
      return;
    }
    setForm({ email: "", name: "", password: "password", parentId: "" });
    await reload();
  }

  async function assignOwner() {
    setError(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        communityId: assignForm.communityId,
        salespersonId: assignForm.salespersonId,
        reason: assignForm.reason || "Assigned",
        role: "owner",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to assign");
      return;
    }
    setAssignForm({ communityId: "", salespersonId: "", reason: "" });
    await reload();
  }

  async function closeContract() {
    setError(null);
    const res = await fetch("/api/sales/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "close_contract",
        communityId: contractForm.communityId,
        contractValueUsd: Number(contractForm.contractValueUsd),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to close contract");
      return;
    }
    await reload();
  }

  async function markPaid(ids: string[]) {
    await fetch("/api/sales/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid", lineIds: ids }),
    });
    await reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sales CRM</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign communities, manage the sales tree, and record commissions.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            ["people", "Salespeople"],
            ["assign", "Assignments"],
            ["commissions", "Commissions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium",
              tab === id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {tab === "people" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Add salesperson</h2>
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Temp password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">No upline</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void createPerson()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Create
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Team tree</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {people.map((p) => (
                <li key={p.id} className="py-2 text-sm">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="text-slate-500">{p.email}</div>
                  <div className="text-xs text-slate-400">
                    Upline: {p.parentName ?? "—"} · Active clubs: {p.activeAssignments}
                  </div>
                </li>
              ))}
              {people.length === 0 ? (
                <li className="py-4 text-sm text-slate-400">No salespeople yet.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "assign" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Assign / reassign community owner</h2>
            <p className="mt-1 text-xs text-slate-500">
              Ending the previous owner preserves history; new residuals go to the new owner.
            </p>
            <div className="mt-3 space-y-2">
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={assignForm.communityId}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, communityId: e.target.value }))
                }
              >
                <option value="">Community</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={assignForm.salespersonId}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, salespersonId: e.target.value }))
                }
              >
                <option value="">Salesperson</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Reason (optional)"
                value={assignForm.reason}
                onChange={(e) =>
                  setAssignForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={() => void assignOwner()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Assign owner
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Active owners</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {activeOwners.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="font-medium">{a.communityName}</div>
                  <div className="text-slate-500">{a.salespersonName}</div>
                  <div className="text-xs text-slate-400">
                    Since {new Date(a.startedAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
              {activeOwners.length === 0 ? (
                <li className="py-4 text-sm text-slate-400">No active assignments.</li>
              ) : null}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">History</h3>
            <ul className="mt-2 max-h-48 overflow-auto divide-y divide-slate-100">
              {assignments
                .filter((a) => a.endedAt)
                .slice(0, 20)
                .map((a) => (
                  <li key={a.id} className="py-2 text-xs text-slate-500">
                    {a.communityName}: {a.salespersonName} ended{" "}
                    {a.endedAt ? new Date(a.endedAt).toLocaleDateString() : ""}
                    {a.reason ? ` (${a.reason})` : ""}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "commissions" ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Close community contract</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={contractForm.communityId}
                onChange={(e) =>
                  setContractForm((f) => ({ ...f, communityId: e.target.value }))
                }
              >
                <option value="">Community</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={contractForm.contractValueUsd}
                onChange={(e) =>
                  setContractForm((f) => ({
                    ...f,
                    contractValueUsd: e.target.value,
                  }))
                }
                placeholder="USD value"
              />
              <button
                type="button"
                onClick={() => void closeContract()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Record close + splits
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Rep</th>
                  <th className="px-3 py-2">Community</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{l.salespersonName}</td>
                    <td className="px-3 py-2">{l.communityName}</td>
                    <td className="px-3 py-2 text-xs">{l.eventType}</td>
                    <td className="px-3 py-2">{l.level}</td>
                    <td className="px-3 py-2 font-medium">
                      ${l.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs">{l.status}</td>
                    <td className="px-3 py-2">
                      {l.status !== "paid" ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#007aff]"
                          onClick={() => void markPaid([l.id])}
                        >
                          Mark paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No commission lines yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
