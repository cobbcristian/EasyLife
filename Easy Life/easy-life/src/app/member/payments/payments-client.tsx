"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { PaymentMethodsSettings } from "@/components/payments/payment-methods-settings";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { communityIsResidentialHoa } from "@/lib/community-features";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Charge {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
}

interface StatementLine {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: string;
}

function statusClass(status: string) {
  if (status === "paid") return "text-[var(--mvp-status-going)]";
  if (status === "overdue") return "text-[#c45c5c]";
  return "text-[var(--mvp-status-pending)]";
}

export function PaymentsClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [membershipName, setMembershipName] = useState("");
  const [paysHoa, setPaysHoa] = useState<boolean | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [residencyStatus, setResidencyStatus] = useState("");
  const [hasClubDining, setHasClubDining] = useState(true);
  const [hoaPortal, setHoaPortal] = useState<{ label: string; url: string } | null>(
    null,
  );
  const [hoaInAppCheckout, setHoaInAppCheckout] = useState(false);
  const [hoaDues, setHoaDues] = useState<{
    unit: string;
    monthlyAmount: number | null;
    amountDue: number | null;
    productName: string;
  } | null>(null);
  const [hoaPaying, setHoaPaying] = useState(false);
  const [fb, setFb] = useState<{
    required: number;
    spent: number;
    remaining: number;
    periodStart: string;
    periodEnd: string;
    periodKind: string;
  } | null>(null);
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [totals, setTotals] = useState({ due: 0, paid: 0, dining: 0 });

  function loadCharges() {
    fetch("/api/member/charges")
      .then((r) => r.json())
      .then((d) => setCharges(d.charges ?? []))
      .catch(() => {});
  }

  function loadHoaDues() {
    fetch("/api/member/hoa-dues")
      .then((r) => r.json())
      .then((d) => {
        setHoaInAppCheckout(Boolean(d.inAppCheckout));
        const portal = d.legacyPortal as
          | { label?: string; url?: string }
          | null
          | undefined;
        if (portal?.label && portal?.url) {
          setHoaPortal({ label: portal.label, url: portal.url });
        }
        if (d.dues?.unit) {
          setHoaDues({
            unit: d.dues.unit,
            monthlyAmount: d.dues.monthlyAmount ?? null,
            amountDue: d.dues.amountDue ?? null,
            productName: d.product?.name ?? "Oceanside HOA Dues",
          });
        } else {
          setHoaDues(null);
        }
      })
      .catch(() => {});
  }

  function loadStatement() {
    fetch("/api/member/statement")
      .then((r) => r.json())
      .then((d) => {
        setMembershipName(d.membership?.tierName ?? "");
        setPaysHoa(d.membership?.paysHoa ?? null);
        setCommunityId(d.membership?.communityId ?? null);
        setResidencyStatus(d.membership?.residencyStatus ?? "");
        setHasClubDining(d.membership?.hasClubDining !== false);
        setHoaInAppCheckout(Boolean(d.membership?.hoaInAppCheckout));
        const portal = d.membership?.hoaPaymentPortal as
          | { label?: string; url?: string }
          | null
          | undefined;
        setHoaPortal(
          portal?.label && portal?.url
            ? { label: portal.label, url: portal.url }
            : null,
        );
        if (d.fbMinimum && d.membership?.hasFbMinimum !== false) {
          setFb({
            required: d.fbMinimum.required,
            spent: d.fbMinimum.spent,
            remaining: d.fbMinimum.remaining,
            periodStart: d.fbMinimum.periodStart,
            periodEnd: d.fbMinimum.periodEnd,
            periodKind: d.fbMinimum.periodKind,
          });
        } else {
          setFb(null);
        }
        setStatementLines(d.statement?.lines ?? []);
        setTotals({
          due: d.statement?.totals?.due ?? 0,
          paid: d.statement?.totals?.paid ?? 0,
          dining: d.statement?.totals?.dining ?? 0,
        });
      })
      .catch(() => {});
  }

  async function payHoaDues() {
    setHoaPaying(true);
    try {
      const res = await fetch("/api/member/hoa-checkout", { method: "POST" });
      const data = (await res.json()) as {
        url?: string;
        paid?: boolean;
        returnPath?: string;
        error?: string;
        amount?: number;
        unit?: string;
      };
      if (!res.ok) {
        toast({
          variant: "warning",
          title: data.error ?? t("Could not start HOA payment"),
        });
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.paid && data.returnPath) {
        toast({ variant: "success", title: t("Payment successful") });
        router.replace(data.returnPath);
        loadCharges();
        loadStatement();
        loadHoaDues();
      }
    } catch {
      toast({ variant: "warning", title: t("Could not start HOA payment") });
    } finally {
      setHoaPaying(false);
    }
  }

  useEffect(() => {
    loadCharges();
    loadStatement();
    loadHoaDues();
  }, []);

  useEffect(() => {
    const status = searchParams.get("payment");
    const chargeId = searchParams.get("chargeId");
    if (status === "success") {
      if (chargeId) {
        fetch("/api/member/charges/mark-paid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chargeId }),
        }).finally(() => {
          loadCharges();
          loadStatement();
          loadHoaDues();
        });
      } else {
        loadCharges();
        loadStatement();
        loadHoaDues();
      }
      toast({ variant: "success", title: t("Payment successful") });
      router.replace("/member/payments");
    }
  }, [searchParams, router, t, toast]);

  const totalDue = charges
    .filter((c) => c.status !== "paid")
    .reduce((s, c) => s + c.amount, 0);
  const paid = charges.filter((c) => c.status === "paid").length;
  const fbPct =
    fb && fb.required > 0 ? Math.min(100, Math.round((fb.spent / fb.required) * 100)) : 100;
  const isResidentialHoa = communityIsResidentialHoa(communityId);
  // Oceanside: HOA is ClickPay-only for now — don't show empty club receipts/statements.
  // Also use ClickPay portal as a signal so empties stay hidden before communityId loads.
  const clickPayOnly = Boolean(hoaPortal) && !hoaInAppCheckout;
  const hideClubLedger = isResidentialHoa || clickPayOnly;
  const showClubLedgerSummary = !hideClubLedger || charges.length > 0 || totalDue > 0;
  const showBalancesHistory = !hideClubLedger || charges.length > 0;
  const showAccountStatement = !hideClubLedger || statementLines.length > 0;
  const showPaymentMethods = !hideClubLedger;

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Payments")}
          </h1>
          {membershipName ? (
            <p className="mt-1 text-xs text-grey">
              {t("Membership")}: {membershipName}
              {!communityIsResidentialHoa(communityId) ? (
                <>
                  {residencyStatus === "resident"
                    ? ` · ${t("Resident")}`
                    : residencyStatus
                      ? ` · ${t("Non-resident")}`
                      : ""}
                  {paysHoa === false
                    ? ` · ${t("No HOA")}`
                    : paysHoa
                      ? ` · ${t("HOA dues apply")}`
                      : ""}
                </>
              ) : null}
            </p>
          ) : null}
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {/* Condo HOA pays externally (ClickPay) — no in-app club ledger yet. */}
          {showClubLedgerSummary ? (
            <div
              className={
                hasClubDining ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"
              }
            >
              <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-grey">
                  {t("Amount Due")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{formatCurrency(totalDue)}</p>
              </div>
              <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-grey">
                  {t("Paid")}
                </p>
                <p className="mt-1 text-sm font-bold text-ink">{paid}</p>
              </div>
              {hasClubDining ? (
                <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-grey">
                    {t("Dining")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {formatCurrency(totals.dining)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {paysHoa !== false && hoaInAppCheckout ? (
            <section className="rounded-2xl border border-[var(--mvp-blue)]/25 bg-[var(--mvp-blue)]/5 p-4">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Pay HOA dues")}
              </h2>
              <p className="mt-1 text-sm text-grey">
                {hoaDues?.productName ?? t("Oceanside HOA Dues")}
                {hoaDues?.unit ? ` · ${t("Unit")} ${hoaDues.unit}` : ""}
              </p>
              {hoaDues?.amountDue != null && hoaDues.amountDue > 0 ? (
                <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
                  {formatCurrency(hoaDues.amountDue)}
                  <span className="ml-2 text-xs font-medium text-grey">
                    {t("amount due")}
                  </span>
                </p>
              ) : hoaDues?.unit ? (
                <p className="mt-2 text-sm font-medium text-[var(--mvp-status-going)]">
                  {t("HOA balance paid for this period")}
                </p>
              ) : (
                <p className="mt-2 text-sm text-grey">
                  {t(
                    "Link your unit with association management to see your assessment.",
                  )}
                </p>
              )}
              <p className="mt-2 text-[11px] text-grey">
                {t(
                  "Checkout amount comes from your unit’s HOA record. You cannot change it.",
                )}
              </p>
              {hoaDues?.amountDue != null && hoaDues.amountDue > 0 ? (
                <button
                  type="button"
                  disabled={hoaPaying}
                  onClick={() => void payHoaDues()}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {hoaPaying ? t("Starting checkout…") : t("Pay HOA dues")} →
                </button>
              ) : null}
              {hoaPortal ? (
                <p className="mt-3 text-[11px] text-grey">
                  {t("Prefer the legacy portal?")}{" "}
                  <a
                    href={hoaPortal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--mvp-blue)]"
                  >
                    {t("Open")} {hoaPortal.label}
                  </a>
                </p>
              ) : null}
            </section>
          ) : hoaPortal && paysHoa !== false ? (
            <section className="rounded-2xl border border-[var(--mvp-blue)]/25 bg-[var(--mvp-blue)]/5 p-4">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Pay HOA dues")}
              </h2>
              <p className="mt-1 text-sm text-grey">
                {t(
                  "Association assessments are paid on the external HOA portal.",
                )}
              </p>
              <a
                href={hoaPortal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Open")} {hoaPortal.label} →
              </a>
              <Link
                href="/member/newsletter"
                className="mt-3 flex text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("HOA Newsletter")} →
              </Link>
            </section>
          ) : null}

          {paysHoa === false ? (
            <p className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-xs text-grey">
              {t(
                "You are a club member only — not an on-property HOA resident. You will not see HOA assessments, property tools, or association service requests. Club charges and F&B still appear below.",
              )}
            </p>
          ) : paysHoa && hoaInAppCheckout ? (
            <p className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-xs text-grey">
              {t(
                "HOA assessments use secure Stripe Checkout for your unit’s amount. Amenity and community charges appear in the list below.",
              )}
            </p>
          ) : paysHoa && !hoaPortal ? (
            <p className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-xs text-grey">
              {t(
                "You live on property and pay HOA / association dues in addition to club charges.",
              )}
            </p>
          ) : null}

          {fb && fb.required > 0 ? (
            <section className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">
                    {t("Food & beverage minimum")}
                  </h2>
                  <p className="mt-0.5 text-xs text-grey">
                    {t(fb.periodKind.replace("_", " "))} · {formatDate(fb.periodStart)} –{" "}
                    {formatDate(fb.periodEnd)}
                  </p>
                </div>
                <p className="text-sm font-bold text-ink">
                  {formatCurrency(fb.spent)} / {formatCurrency(fb.required)}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8ebf0]">
                <div
                  className="h-full rounded-full bg-[var(--mvp-blue)]"
                  style={{ width: `${fbPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-grey">
                {fb.remaining > 0
                  ? `${formatCurrency(fb.remaining)} ${t("remaining this period")}`
                  : t("Minimum met for this period")}
              </p>
              <Link
                href="/member/dining"
                className="mt-2 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("Order dining")} →
              </Link>
            </section>
          ) : null}

          {totalDue > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mvp-blue)]/20 bg-[var(--mvp-blue)]/5 px-4 py-3">
              <p className="text-[12px] text-grey">{t("Pay all outstanding balances")}</p>
              <CheckoutButton
                amount={totalDue}
                description={t("Club account — QuickPay")}
                returnPath="/member/payments"
                label={t("QuickPay")}
                onPaid={loadCharges}
                showCardOverride
              />
            </div>
          ) : null}

          {showBalancesHistory ? (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">{t("Balances & History")}</h2>
              {charges.length === 0 ? (
                <div className="mt-3 rounded-xl bg-[#f7f8fa] p-5">
                  <p className="text-sm font-semibold text-ink">{t("No receipts yet")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {hoaPortal
                      ? t(
                          hoaInAppCheckout
                            ? "Amenity and community charges will appear here. Pay HOA dues with the button above."
                            : "Amenity and community charges will appear here after you pay in-app.",
                        )
                      : t("Dues and bookings will appear here after you pay.")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasClubDining ? (
                      <Link
                        href="/member/dining"
                        className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                      >
                        {t("Order dining")}
                      </Link>
                    ) : null}
                    <Link
                      href="/member/bookings"
                      className={
                        hasClubDining
                          ? "inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
                          : "inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                      }
                    >
                      {t("Book a court")}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-[#eceff3]">
                  {charges.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-ink">{c.description}</p>
                        <p className="mt-0.5 text-[12px] text-grey">
                          {formatCurrency(c.amount)}
                          {c.dueDate ? ` · ${formatDate(c.dueDate)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`text-[12px] font-semibold ${statusClass(c.status)}`}>
                          {t(c.status)}
                        </span>
                        {c.status !== "paid" ? (
                          <CheckoutButton
                            amount={c.amount}
                            description={c.description}
                            returnPath="/member/payments"
                            chargeId={c.id}
                            label={t("Pay")}
                            onPaid={loadCharges}
                            showCardOverride
                          />
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {showAccountStatement ? (
            <section id="statement">
              <h2 className="text-[15px] font-semibold text-ink">{t("Account statement")}</h2>
              <p className="mt-1 text-xs text-grey">
                {hasClubDining
                  ? t("What you spent this billing period — dining, lessons, and charges.")
                  : t("What you spent this billing period — amenities, lessons, and charges.")}
              </p>
              {statementLines.length === 0 ? (
                <div className="mt-3 rounded-xl bg-[#f7f8fa] p-4">
                  <p className="text-sm text-grey">{t("No activity on this statement yet.")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hasClubDining ? (
                      <Link
                        href="/member/dining"
                        className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                      >
                        {t("Order dining")}
                      </Link>
                    ) : null}
                    <Link
                      href="/member/bookings"
                      className={
                        hasClubDining
                          ? "inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
                          : "inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                      }
                    >
                      {t("Book amenity")}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-[#eceff3]">
                  {statementLines.slice(0, 40).map((line) => (
                    <li key={line.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{line.description}</p>
                        <p className="text-[11px] capitalize text-grey">
                          {formatDate(line.date)} · {line.category}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-ink">
                        {line.amount > 0 ? formatCurrency(line.amount) : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {showPaymentMethods ? (
            <PaymentMethodsSettings returnPath="/member/payments" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
