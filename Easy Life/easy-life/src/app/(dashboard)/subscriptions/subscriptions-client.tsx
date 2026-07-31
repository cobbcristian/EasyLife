"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import type { ProviderSubscriptionRow } from "@/lib/server/provider-subscriptions";
import type { SubscriptionStatus } from "@/lib/server/provider-subscriptions";

const STATUS_OPTIONS: SubscriptionStatus[] = [
  "pending",
  "active",
  "past_due",
  "canceled",
  "incomplete",
];

function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusClass(status: SubscriptionStatus): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-800";
    case "past_due":
      return "bg-amber-50 text-amber-900";
    case "canceled":
      return "bg-red-50 text-red-800";
    case "incomplete":
      return "bg-orange-50 text-orange-900";
    case "pending":
      return "bg-slate-100 text-slate-700";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function SubscriptionsClient({
  initial,
  stripeConfigured,
}: {
  initial: ProviderSubscriptionRow[];
  stripeConfigured: boolean;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.userEmail.toLowerCase().includes(q) ||
        r.businessName.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }, [rows, query]);

  async function patch(
    userEmail: string,
    body: { status?: SubscriptionStatus; action?: "sync" },
  ) {
    setBusyEmail(userEmail);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: "Update failed",
          description: data.error ?? "Could not update subscription",
        });
        return;
      }
      const next = data.subscription as ProviderSubscriptionRow;
      setRows((prev) =>
        prev.map((r) => (r.userEmail === next.userEmail ? next : r)),
      );
      toast({
        variant: "success",
        title: body.action === "sync" ? "Synced from Stripe" : "Status updated",
      });
    } catch {
      toast({
        variant: "warning",
        title: "Something went wrong",
        description: "Please try again.",
      });
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Subscriptions" right="logo" />
      <PageBody>
        <p className="mb-5 max-w-2xl text-sm text-grey">
          Super admin subscription management for service provider accounts.
          Providers manage payment method and cancellation through Stripe Billing
          Portal from Account → Subscription Management.
        </p>

        {!stripeConfigured ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Stripe keys are not configured. You can still mark subscriptions
            active for demo access.
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search providers"
              className="h-12 w-full rounded-lg border border-border-2 bg-[#f7f8fa] py-2 pl-10 pr-3 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
          </div>
        </div>

        <p className="mb-4 text-base font-medium text-black">
          Provider subscriptions{" "}
          <span className="text-[var(--mvp-blue)]">{filtered.length}</span>
        </p>

        <ul className="divide-y divide-border-2 border-y border-border-2">
          {filtered.map((row) => {
            const busy = busyEmail === row.userEmail;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-ink">
                    {row.businessName || row.userEmail}
                  </p>
                  <p className="truncate text-sm text-grey">{row.userEmail}</p>
                  <p className="mt-1 text-xs text-grey">
                    {row.planName} ·{" "}
                    {row.currentPeriodEnd
                      ? `Renews ${new Date(row.currentPeriodEnd).toLocaleDateString()}`
                      : "No renewal date"}
                    {row.cancelAtPeriodEnd ? " · Cancels at period end" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold ${statusClass(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                  <select
                    disabled={busy}
                    value={row.status}
                    onChange={(e) =>
                      patch(row.userEmail, {
                        status: e.target.value as SubscriptionStatus,
                      })
                    }
                    className="h-10 rounded-lg border border-border-2 bg-white px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                    aria-label={`Set status for ${row.userEmail}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !stripeConfigured}
                    onClick={() => patch(row.userEmail, { action: "sync" })}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-2 px-3 text-sm font-medium text-ink hover:bg-[#fafafa] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                    Sync
                  </button>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="rounded-xl bg-[#f7f8fa] px-5 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No provider subscriptions yet.</p>
              <p className="mt-1 text-sm text-grey">
                Providers appear here after they connect billing on their account.
              </p>
              <a
                href="/communities"
                className="mt-4 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
              >
                Open communities →
              </a>
            </li>
          ) : null}
        </ul>
      </PageBody>
    </div>
  );
}
