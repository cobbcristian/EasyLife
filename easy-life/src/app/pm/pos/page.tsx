"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type Chit = {
  id: string;
  memberName: string;
  location: string;
  status: string;
  total: number;
  lines: { name: string; qty: number; unitPrice: number }[];
};

export default function PmPosPage() {
  const [chits, setChits] = useState<Chit[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("12");

  function load() {
    fetch("/api/pos/chits")
      .then((r) => r.json())
      .then((d) => setChits(d.chits ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function createChit() {
    if (!memberEmail || !memberName || !itemName) return;
    await fetch("/api/pos/chits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberEmail,
        memberName,
        location: "Clubhouse",
        lines: [{ name: itemName, qty: 1, unitPrice: parseFloat(itemPrice) || 0 }],
      }),
    });
    load();
  }

  async function postChit(id: string) {
    await fetch("/api/pos/chits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "post" }),
    });
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mobile POS & Chits</h1>
        <p className="text-sm text-muted-foreground">
          Open chits, post to member accounts, integrated with statements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New chit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Member email</Label>
            <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
          </div>
          <div>
            <Label>Member name</Label>
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          </div>
          <div>
            <Label>Item</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div>
            <Label>Price</Label>
            <Input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
          </div>
          <Button onClick={createChit} className="sm:col-span-2">
            Open chit
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {chits.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-semibold">{c.memberName}</p>
                <p className="text-sm text-muted-foreground">
                  {c.location} · {c.status} · {formatCurrency(c.total)}
                </p>
              </div>
              {c.status === "open" && (
                <Button size="sm" onClick={() => postChit(c.id)}>
                  Post to account
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
