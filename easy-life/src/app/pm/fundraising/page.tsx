"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type Campaign = {
  id: string;
  title: string;
  goalAmount: number;
  raisedAmount: number;
  status: string;
};

export default function PmFundraisingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("5000");

  function load() {
    fetch("/api/fundraising")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!title.trim()) return;
    await fetch("/api/fundraising", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        goalAmount: parseFloat(goal) || 5000,
        status: "active",
      }),
    });
    setTitle("");
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fundraising campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Golf tournament crowdfunding and charity events (GolfRegistrations-style).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Goal ($)</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <Button className="self-end" onClick={create}>
            Launch
          </Button>
        </CardContent>
      </Card>
      <ul className="space-y-3">
        {campaigns.map((c) => (
          <li key={c.id} className="rounded-xl border p-4">
            <p className="font-semibold">{c.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(c.raisedAmount)} / {formatCurrency(c.goalAmount)} · {c.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
