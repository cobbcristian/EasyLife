"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type PaymentRequest } from "@stripe/stripe-js";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type WalletPayKind = "hoa" | "charge" | "amount";

interface WalletPayButtonsProps {
  amount: number;
  description: string;
  kind?: WalletPayKind;
  chargeId?: string;
  returnPath?: string;
  onPaid?: () => void;
  className?: string;
  /** Show buttons even in demo (always clickable). */
  showInDemo?: boolean;
}

function ApplePayMark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold tracking-tight">
      <svg width="16" height="20" viewBox="0 0 170 170" aria-hidden className="shrink-0">
        <path
          fill="currentColor"
          d="M150.4 130.3c-2.4 5.4-5.2 10.4-8.4 15.1-4.4 6.5-8 9.8-10.8 9.8-2.2 0-5.4-1.6-9.6-4.8-4.2-3.2-7.8-4.8-10.8-4.8-2.2 0-5.2 1.5-8.8 4.5-3.7 3-6.7 4.5-9 4.5-3.4 0-6.8-3.1-10.2-9.3-3.5-6.2-6.3-13.1-8.4-20.8-2.3-8.5-3.5-16.7-3.5-24.6 0-9.1 2-16.9 6-23.4 3.1-4.5 7.2-6.8 12.3-6.9 2.4 0 5.6 1.4 9.5 4.1 3.9 2.7 6.4 4.1 7.5 4.1 1 0 4.4-1.6 10.1-4.7 5.4-2.8 9.9-4 13.5-3.5 10 0.8 17.5 4.7 22.5 11.8-9 5.5-13.4 13.1-13.2 22.8 0.2 7.6 2.8 13.9 7.9 18.9 2.3 2.2 4.9 3.9 7.7 5.1-0.6 1.8-1.3 3.5-2.1 5.1zM119.2 7.6c0 5.9-2.2 11.4-6.5 16.3-5.2 5.9-11.5 9.3-18.4 8.8-0.1-4.7 2-9.6 6.3-13.8 2.1-2.2 4.6-4 7.5-5.5 3.1-1.6 6-2.5 8.8-2.6 0.1 2.3 0 4.5-0.7 6.8z"
        />
      </svg>
      Pay
    </span>
  );
}

function GooglePayMark() {
  return (
    <span className="inline-flex items-center gap-1 font-semibold">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
      <span className="ml-0.5 text-ink">Pay</span>
    </span>
  );
}

export function WalletPayButtons({
  amount,
  description,
  kind = "amount",
  chargeId,
  returnPath = "/member/payments",
  onPaid,
  className,
  showInDemo = true,
}: WalletPayButtonsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);

  useEffect(() => {
    fetch("/api/member/payment-settings")
      .then((r) => r.json())
      .then((d) => {
        const demo = Boolean(d.demoPaymentsAllowed) && !d.walletPayEnabled;
        setDemoMode(demo);
        setPublishableKey(d.stripePublishableKey ?? null);
        if (d.walletPayEnabled && d.stripePublishableKey) {
          void setupPaymentRequest(d.stripePublishableKey);
        } else if (demo && showInDemo) {
          setAppleAvailable(true);
          setGoogleAvailable(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, showInDemo]);

  async function setupPaymentRequest(pk: string) {
    const stripe = await loadStripe(pk);
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: {
        label: description.slice(0, 40),
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    const result = await pr.canMakePayment();
    if (result) {
      paymentRequestRef.current = pr;
      setAppleAvailable(Boolean(result.applePay));
      setGoogleAvailable(Boolean(result.googlePay));
    }
  }

  async function payWithWallet(wallet: "apple" | "google") {
    setLoading(true);
    try {
      const res = await fetch("/api/member/wallet-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, chargeId, amount, description }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "warning",
          title: data.error ?? t("Payment unavailable"),
        });
        return;
      }

      if (data.paid && data.returnPath) {
        onPaid?.();
        window.location.href = data.returnPath;
        return;
      }

      const pr = paymentRequestRef.current;
      const stripe = publishableKey ? await loadStripe(publishableKey) : null;
      if (!pr || !stripe || !data.clientSecret) {
        toast({ variant: "warning", title: t("Wallet pay is not available on this device") });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const handler = async (ev: {
          complete: (status: "success" | "fail") => void;
          paymentMethod: { id: string };
        }) => {
          pr.off("paymentmethod", handler);
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            data.clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: true },
          );
          if (error) {
            ev.complete("fail");
            reject(error);
            return;
          }
          ev.complete("success");
          if (paymentIntent?.status === "succeeded") {
            if (data.chargeId) {
              await fetch("/api/member/charges/mark-paid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chargeId: data.chargeId }),
              }).catch(() => {});
            } else if (Array.isArray(data.chargeIds) && data.chargeIds.length > 0) {
              await Promise.all(
                data.chargeIds.map((id: string) =>
                  fetch("/api/member/charges/mark-paid", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ chargeId: id }),
                  }).catch(() => {}),
                ),
              );
            }
            onPaid?.();
            window.location.href = data.returnPath ?? `${returnPath}?payment=success`;
          }
          resolve();
        };
        pr.on("paymentmethod", handler);
        void (async () => {
          try {
            await pr.show();
          } catch (showError) {
            pr.off("paymentmethod", handler);
            reject(showError);
          }
        })();
      });
    } catch {
      toast({ variant: "warning", title: t("Payment could not be completed") });
    } finally {
      setLoading(false);
    }

    void wallet;
  }

  if (!appleAvailable && !googleAvailable) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-grey">
        {t("Express checkout")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {appleAvailable ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void payWithWallet("apple")}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black text-white transition hover:bg-black/90 disabled:opacity-60"
            aria-label={t("Pay with Apple Pay")}
          >
            <ApplePayMark />
          </button>
        ) : null}
        {googleAvailable ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void payWithWallet("google")}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dadce0] bg-white text-ink shadow-sm transition hover:bg-[#f8f9fa] disabled:opacity-60"
            aria-label={t("Pay with Google Pay")}
          >
            <GooglePayMark />
          </button>
        ) : null}
      </div>
      {demoMode ? (
        <p className="text-[10px] text-grey">
          {t("Demo mode — wallet buttons mark the charge paid without Stripe.")}
        </p>
      ) : null}
    </div>
  );
}
