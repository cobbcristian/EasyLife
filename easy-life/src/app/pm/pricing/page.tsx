"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Rule = {
  id: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  multiplier: number;
  active: boolean;
};

export default function PmPricingPage() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    fetch("/api/tee-pricing")
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dynamic Tee Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Twilight, peak, and yield rules — applied automatically at booking.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pricing rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {rules.map((r) => (
              <li key={r.id} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground">
                    Day {r.dayOfWeek} · {r.startTime}–{r.endTime}
                  </p>
                </div>
                <span className="font-semibold">{r.multiplier}x</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
