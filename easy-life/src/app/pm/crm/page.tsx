"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Prospect = {
  id: string;
  name: string;
  email: string | null;
  stage: string;
  source: string;
};

type Pipeline = { stage: string; count: number }[];

const STAGES = ["lead", "prospect", "tour", "application", "member", "lost"];

export default function PmCrmPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function load() {
    fetch("/api/crm")
      .then((r) => r.json())
      .then((d) => {
        setProspects(d.prospects ?? []);
        setPipeline(d.pipeline ?? []);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function addProspect() {
    if (!name.trim()) return;
    await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, stage: "lead", source: "walk-in" }),
    });
    setName("");
    setEmail("");
    load();
  }

  async function moveStage(id: string, stage: string) {
    await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stage", prospectId: id, stage }),
    });
    load();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Member CRM</h1>
        <p className="text-sm text-muted-foreground">
          Leads, tours, applications — full membership pipeline.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pipeline.map((p) => (
          <Card key={p.stage}>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{p.count}</p>
              <p className="text-xs uppercase text-muted-foreground">{p.stage}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add prospect</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="self-end" onClick={addProspect}>
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {prospects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.email ?? p.source}</p>
                </div>
                <select
                  value={p.stage}
                  onChange={(e) => moveStage(p.id, e.target.value)}
                  className="rounded-md border px-2 py-1 text-sm"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
