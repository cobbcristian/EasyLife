"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type ChargeView = {
  id: string;
  guestName: string;
  guestEmail: string | null;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
};

function GuestPayForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = String(params.token ?? "");
  const [charge, setCharge] = useState<ChargeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await fetch(`/api/pay/guest/${token}`);
      if (!res.ok) {
        setError("This invoice link is invalid or expired.");
        return;
      }
      const data = await res.json();
      setCharge(data.charge);
      if (data.charge?.status === "paid") setPaid(true);
    })();
  }, [token]);

  useEffect(() => {
    if (searchParams.get("payment") === "success") setPaid(true);
  }, [searchParams]);

  async function pay() {
    if (!token) return;
    setBusy(true);
    const res = await fetch(`/api/pay/guest/${token}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Payment failed");
      return;
    }
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setPaid(true);
  }

  if (error && !charge) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!charge) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-grey">
        Loading invoice…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border-2 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-grey">
        Court guest fee
      </p>
      <h1 className="mt-1 text-xl font-semibold text-ink">{charge.guestName}</h1>
      <p className="mt-3 text-sm text-grey">{charge.description}</p>
      <p className="mt-6 text-3xl font-semibold text-ink">
        {formatCurrency(charge.amount)}
      </p>
      {charge.dueDate ? (
        <p className="mt-1 text-xs text-grey">Due {charge.dueDate}</p>
      ) : null}

      {paid || charge.status === "paid" ? (
        <div className="mt-6 rounded-lg border border-[#c6efce] bg-[#f0fff4] px-4 py-3 text-sm font-medium text-ink">
          Paid — thank you. You&apos;re all set for court play.
        </div>
      ) : (
        <Button
          className="mt-6 w-full"
          disabled={busy}
          onClick={() => void pay()}
        >
          {busy ? "Processing…" : "Pay guest fee"}
        </Button>
      )}

      {error && charge ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export default function GuestPayPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-4 py-12 font-[family-name:var(--font-poppins)]">
      <Suspense fallback={null}>
        <GuestPayForm />
      </Suspense>
    </div>
  );
}
