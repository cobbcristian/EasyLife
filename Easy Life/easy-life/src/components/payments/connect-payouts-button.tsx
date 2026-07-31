"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ConnectPayoutsButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: "Payouts unavailable",
          description: data.error ?? "Please try again.",
        });
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({
        variant: "warning",
        title: "Something went wrong",
        description: "Please try again.",
      });
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? "Connecting..." : "Set up payouts"}
    </Button>
  );
}
