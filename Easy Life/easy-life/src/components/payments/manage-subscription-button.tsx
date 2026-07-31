"use client";

import { useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ManageSubscriptionButtonProps = {
  className?: string;
  variant?: "primary" | "link" | "row";
  label?: string;
  trailing?: ReactNode;
};

export function ManageSubscriptionButton({
  className,
  variant = "primary",
  label,
  trailing,
}: ManageSubscriptionButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const text = loading ? "Opening..." : (label ?? "Manage subscription");

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/provider/account#billing" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: "Billing unavailable",
          description: data.error ?? "Open the billing section below to manage your plan.",
        });
        document.getElementById("billing")?.scrollIntoView({ behavior: "smooth" });
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast({
        variant: "warning",
        title: "Something went wrong",
        description: "Please try again or use the billing section below.",
      });
      document.getElementById("billing")?.scrollIntoView({ behavior: "smooth" });
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "text-sm font-medium text-[var(--mvp-blue)] hover:underline disabled:opacity-60",
          className,
        )}
      >
        {text}
      </button>
    );
  }

  if (variant === "row" || trailing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-lg border border-border-2 px-4 text-left text-sm text-black hover:bg-[#fafafa] disabled:opacity-60",
          className,
        )}
      >
        <span>{text}</span>
        {trailing}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "flex h-[50px] items-center justify-center rounded-lg border border-[var(--mvp-blue)] bg-white px-6 text-base font-semibold text-[var(--mvp-blue)] transition hover:bg-[var(--mvp-blue)]/5 disabled:opacity-60",
        className,
      )}
    >
      {text}
    </button>
  );
}
