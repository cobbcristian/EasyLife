"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type Account = { id: string; code: string; name: string; type: string };
type Entry = { id: string; entryDate: string; memo: string; lines: { debit: number; credit: number }[] };

export default function PmAccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [qbConnected, setQbConnected] = useState(false);
  const [realmId, setRealmId] = useState("");

  function load() {
    fetch("/api/accounting")
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        setEntries(d.entries ?? []);
        setQbConnected(Boolean(d.quickbooks?.connected));
        setRealmId(d.quickbooks?.realmId ?? "");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function connectQb() {
    await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect_qb", realmId }),
    });
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Club Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Chart of accounts, journal entries, QuickBooks export.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/accounting?export=quickbooks">
            <Button variant="outline">Export QuickBooks CSV</Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QuickBooks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Label>Realm / Company ID</Label>
            <Input value={realmId} onChange={(e) => setRealmId(e.target.value)} />
          </div>
          <Button onClick={connectQb}>
            {qbConnected ? "Update connection" : "Connect QuickBooks"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart of accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>
                  {a.code} — {a.name}
                </span>
                <span className="text-muted-foreground">{a.type}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent journal entries</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {entries.map((e) => {
              const debit = e.lines.reduce((s, l) => s + l.debit, 0);
              return (
                <li key={e.id} className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex justify-between font-medium">
                    <span>{e.entryDate}</span>
                    <span>{formatCurrency(debit)}</span>
                  </div>
                  <p className="text-muted-foreground">{e.memo || "—"}</p>
                </li>
              );
            })}
            {entries.length === 0 && (
              <li className="text-muted-foreground">No entries yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
