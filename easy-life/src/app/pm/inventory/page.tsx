"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  sku: string;
  name: string;
  category: string;
  qtyOnHand: number;
  reorderLevel: number;
};

export default function PmInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");

  function load() {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem() {
    if (!sku || !name) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", sku, name, qtyOnHand: 0 }),
    });
    setSku("");
    setName("");
    load();
  }

  async function receive(itemId: string) {
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust", itemId, type: "receive", qty: 10 }),
    });
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Pro shop, F&B, and clubhouse stock with reorder alerts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add SKU</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div>
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button className="self-end" onClick={addItem}>
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {i.sku} — {i.name}
                  </p>
                  <p className="text-muted-foreground">
                    {i.qtyOnHand} on hand
                    {i.qtyOnHand <= i.reorderLevel ? " · Low stock" : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => receive(i.id)}>
                  +10 receive
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
