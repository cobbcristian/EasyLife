"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutButton } from "@/components/payments/checkout-button";
import { PaymentMethodsSettings } from "@/components/payments/payment-methods-settings";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
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
  const [residencyStatus, setResidencyStatus] = useState("");
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

  function loadStatement() {
    fetch("/api/member/statement")
      .then((r) => r.json())
      .then((d) => {
        setMembershipName(d.membership?.tierName ?? "");
        setPaysHoa(d.membership?.paysHoa ?? null);
        setResidencyStatus(d.membership?.residencyStatus ?? "");
        if (d.fbMinimum) {
          setFb({
            required: d.fbMinimum.required,
            spent: d.fbMinimum.spent,
            remaining: d.fbMinimum.remaining,
            periodStart: d.fbMinimum.periodStart,
            periodEnd: d.fbMinimum.periodEnd,
            periodKind: d.fbMinimum.periodKind,
          });
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

  useEffect(() => {
    loadCharges();
    loadStatement();
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
        });
      } else {
        loadCharges();
        loadStatement();
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
            </p>
          ) : null}
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="grid grid-cols-3 gap-2">
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
            <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-grey">
                {t("Dining")}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">{formatCurrency(totals.dining)}</p>
            </div>
          </div>

          {paysHoa === false ? (
            <p className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-xs text-grey">
              {t(
                "You are a club member only — not an on-property HOA resident. You will not see HOA assessments, property tools, or association service requests. Club charges and F&B still appear below.",
              )}
            </p>
          ) : paysHoa ? (
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

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Balances & History")}</h2>
            {charges.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#f7f8fa] p-5">
                <p className="text-sm font-semibold text-ink">{t("No receipts yet")}</p>
                <p className="mt-1 text-sm text-grey">
                  {t("Dues and bookings will appear here after you pay.")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/member/dining"
                    className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                  >
                    {t("Order dining")}
                  </Link>
                  <Link
                    href="/member/bookings"
                    className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
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

          <section id="statement">
            <h2 className="text-[15px] font-semibold text-ink">{t("Account statement")}</h2>
            <p className="mt-1 text-xs text-grey">
              {t("What you spent this billing period — dining, lessons, and charges.")}
            </p>
            {statementLines.length === 0 ? (
              <div className="mt-3 rounded-xl bg-[#f7f8fa] p-4">
                <p className="text-sm text-grey">{t("No activity on this statement yet.")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/member/dining"
                    className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                  >
                    {t("Order dining")}
                  </Link>
                  <Link
                    href="/member/bookings"
                    className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
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

          <PaymentMethodsSettings returnPath="/member/payments" />
        </div>
      </div>
      <MemberMvpBottomNav />
    </div>
  );
}
