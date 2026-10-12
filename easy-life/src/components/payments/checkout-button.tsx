"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface CheckoutButtonProps {
  amount: number;
  description: string;
  returnPath?: string;
  chargeId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  onPaid?: () => void;
  showCardOverride?: boolean;
}

export function CheckoutButton({
  amount,
  description,
  returnPath,
  chargeId,
  label = "Pay",
  variant = "primary",
  size = "sm",
  onPaid,
  showCardOverride = false,
}: CheckoutButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preference, setPreference] = useState<"always_prompt" | "store" | null>(null);
  const [defaultLabel, setDefaultLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member/payment-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.preference) setPreference(d.preference);
        const def = d.methods?.find((m: { isDefault: boolean }) => m.isDefault);
        if (def) setDefaultLabel(def.label);
      })
      .catch(() => {});
  }, []);

  async function handleClick(forceCheckout = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description,
          returnPath,
          chargeId,
          forceCheckout,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: "Payment unavailable",
          description: data.error ?? "Please try again.",
        });
        setLoading(false);
        return;
      }

      if (data.paid) {
        onPaid?.();
        if (data.returnPath) {
          window.location.href = data.returnPath;
        } else {
          setLoading(false);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      toast({ variant: "warning", title: "Payment unavailable" });
      setLoading(false);
    } catch {
      toast({
        variant: "warning",
        title: "Something went wrong",
        description: "Please try again.",
      });
      setLoading(false);
    }
  }

  const payLabel =
    preference === "store" && defaultLabel
      ? `${label} (${defaultLabel})`
      : label;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={variant} size={size} onClick={() => handleClick(false)} disabled={loading}>
        {loading ? "Processing..." : payLabel}
      </Button>
      {showCardOverride && preference === "store" ? (
        <button
          type="button"
          className="text-xs text-[var(--mvp-blue)] hover:underline disabled:opacity-50"
          disabled={loading}
          onClick={() => handleClick(true)}
        >
          Enter card instead
        </button>
      ) : null}
    </div>
  );
}
