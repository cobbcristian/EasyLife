"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/ui/brand-icon";
import { BrandStar } from "@/components/ui/brand-star";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { avatarForReviewer, imageForProviderCategory } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

interface LocalPro {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string | null;
  email: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  escrowEnabled: boolean;
  calendarSharingEnabled: boolean;
  calendarShareFeeCents: number;
  escrowFeeCents: number;
}

interface Review {
  id: string;
  memberName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface EscrowJob {
  id: string;
  providerName: string;
  title: string;
  amountCents: number;
  platformFeeCents: number;
  status: string;
  chargeId: string | null;
}

interface SharedCalendar {
  id: string;
  providerName: string;
  status: string;
  feeCents: number;
  chargeId: string | null;
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(!onChange && "cursor-default")}
          aria-label={`${n} stars`}
        >
          <BrandStar className={cn(cls, n <= value ? "" : "opacity-25")} />
        </button>
      ))}
    </div>
  );
}

async function payCharge(
  chargeId: string,
  amount: number,
  description: string,
  returnPath: string,
) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chargeId,
      amount,
      description,
      returnPath,
      forceCheckout: false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Payment failed");
  if (data.url) {
    window.location.href = data.url;
    return { redirected: true };
  }
  return { redirected: false, paid: Boolean(data.paid) };
}

export function LocalProsClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [pros, setPros] = useState<LocalPro[]>([]);
  const [selected, setSelected] = useState<LocalPro | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [escrowTitle, setEscrowTitle] = useState("");
  const [escrowAmount, setEscrowAmount] = useState("150");
  const [jobs, setJobs] = useState<EscrowJob[]>([]);
  const [calendars, setCalendars] = useState<SharedCalendar[]>([]);
  const [category, setCategory] = useState("all");

  const refresh = useCallback(async () => {
    const [prosRes, jobsRes, calRes] = await Promise.all([
      fetch("/api/local-pros"),
      fetch("/api/local-pros/escrow"),
      fetch("/api/local-pros/calendar"),
    ]);
    const [prosData, jobsData, calData] = await Promise.all([
      prosRes.json(),
      jobsRes.json(),
      calRes.json(),
    ]);
    setPros(prosData.pros ?? []);
    setJobs(jobsData.jobs ?? []);
    setCalendars(calData.calendars ?? []);
  }, []);

  useEffect(() => {
    let on = true;
    Promise.all([
      fetch("/api/local-pros"),
      fetch("/api/local-pros/escrow"),
      fetch("/api/local-pros/calendar"),
    ])
      .then(async ([prosRes, jobsRes, calRes]) => {
        const [prosData, jobsData, calData] = await Promise.all([
          prosRes.json(),
          jobsRes.json(),
          calRes.json(),
        ]);
        if (!on) return;
        setPros(prosData.pros ?? []);
        setJobs(jobsData.jobs ?? []);
        setCalendars(calData.calendars ?? []);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const chargeId = params.get("chargeId");
      const done = (
        chargeId
          ? fetch("/api/member/charges/mark-paid", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chargeId }),
            })
          : Promise.resolve()
      ).then(() => refresh());
      void done.catch(() => {});
      toast({ variant: "success", title: t("Payment recorded") });
      window.history.replaceState({}, "", "/member/local-pros");
    }
  }, [refresh, t, toast]);

  async function openPro(pro: LocalPro) {
    setSelected(pro);
    const res = await fetch(`/api/local-pros/${pro.id}/reviews`);
    const data = await res.json();
    setReviews(data.reviews ?? []);
  }

  async function submitReview() {
    if (!selected) return;
    const res = await fetch(`/api/local-pros/${selected.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: myRating, comment: myComment }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save rating") });
      return;
    }
    toast({ variant: "success", title: t("Thanks for your rating") });
    setMyComment("");
    await refresh();
    await openPro(selected);
  }

  async function shareCalendar(pro: LocalPro) {
    const res = await fetch("/api/local-pros/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", providerId: pro.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        variant: "warning",
        title: data.error ?? t("Could not start calendar"),
      });
      return;
    }
    if (data.needsPayment && data.charge) {
      try {
        const pay = await payCharge(
          data.charge.id,
          data.charge.amount,
          data.charge.description,
          "/member/local-pros",
        );
        if (!pay.redirected && pay.paid) {
          toast({ variant: "success", title: t("Shared calendar unlocked") });
          await refresh();
        }
      } catch (e) {
        toast({
          variant: "warning",
          title: e instanceof Error ? e.message : t("Payment failed"),
        });
      }
      return;
    }
    toast({ variant: "success", title: t("Shared calendar ready") });
    await refresh();
  }

  async function createEscrow(pro: LocalPro) {
    const dollars = Number(escrowAmount);
    if (!escrowTitle.trim() || !dollars || dollars <= 0) {
      toast({ variant: "warning", title: t("Enter a job title and amount") });
      return;
    }
    const res = await fetch("/api/local-pros/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        providerId: pro.id,
        title: escrowTitle,
        amountCents: Math.round(dollars * 100),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        variant: "warning",
        title: data.error ?? t("Could not create escrow"),
      });
      return;
    }
    try {
      const pay = await payCharge(
        data.charge.id,
        data.charge.amount,
        data.charge.description,
        "/member/local-pros",
      );
      if (!pay.redirected && pay.paid) {
        toast({ variant: "success", title: t("Payment held in escrow") });
        setEscrowTitle("");
        await refresh();
      }
    } catch (e) {
      toast({
        variant: "warning",
        title: e instanceof Error ? e.message : t("Payment failed"),
      });
    }
  }

  async function escrowAction(jobId: string, action: "release" | "dispute") {
    const res = await fetch("/api/local-pros/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({
        variant: "warning",
        title: data.error ?? t("Could not update escrow"),
      });
      return;
    }
    toast({
      variant: "success",
      title:
        action === "release"
          ? t("Funds released to company")
          : t("Payment disputed — held"),
    });
    await refresh();
  }

  const filtered =
    category === "all" ? pros : pros.filter((p) => p.category === category);
  const categories = Array.from(new Set(pros.map((p) => p.category))).sort();

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Local Pros")}
          </h1>
          <p className="mt-1 text-[12px] text-grey">
            {t(
              "Trusted companies that regularly work in your community — gardening, painting, pool, and more.",
            )}
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                category === "all"
                  ? "bg-[var(--mvp-blue)] text-white"
                  : "bg-[#f2f4f7] text-grey",
              )}
            >
              {t("All")}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                  category === c
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f2f4f7] text-grey",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <ul className="divide-y divide-[#eceff3]">
            {filtered.length === 0 ? (
              <li className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
                <p className="text-sm font-semibold text-ink">
                  {pros.length === 0
                    ? t("No local pros listed yet.")
                    : t("No pros match this category.")}
                </p>
                <Link
                  href="/member/vendors"
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                >
                  {t("Browse services")}
                </Link>
              </li>
            ) : (
              filtered.map((pro) => {
              const thumb =
                pro.imageUrl ||
                imageForProviderCategory(pro.category, "service", pro.name);
              return (
                <li key={pro.id} className="flex items-center gap-3 py-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{pro.name}</p>
                    <p className="mt-0.5 text-[12px] text-grey">
                      {pro.category}
                      {pro.rating != null
                        ? ` · ${pro.rating.toFixed(1)} (${pro.reviewCount})`
                        : ` · ${t("No ratings yet")}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--mvp-blue)]">
                      {pro.calendarSharingEnabled ? (
                        <span className="inline-flex items-center gap-1">
                          <BrandIcon name="CalendarDays" className="h-3 w-3" />
                          {t("Shared calendar")}
                        </span>
                      ) : null}
                      {pro.escrowEnabled ? (
                        <span className="inline-flex items-center gap-1">
                          <BrandIcon name="ShieldCheck" className="h-3 w-3" />
                          {t("Escrow")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openPro(pro)}
                    className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
                  >
                    {t("View")}
                  </button>
                </li>
              );
            })
            )}
          </ul>

          {selected ? (
            <section className="space-y-5 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  selected.imageUrl ||
                  imageForProviderCategory(
                    selected.category,
                    "service",
                    selected.name,
                  )
                }
                alt=""
                className="h-40 w-full rounded-2xl object-cover"
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-grey">{selected.description}</p>
                </div>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-grey"
                  onClick={() => setSelected(null)}
                >
                  {t("Close")}
                </button>
              </div>

              {selected.email ? (
                <Link
                  href={`/member/messages?to=${encodeURIComponent(selected.email)}&name=${encodeURIComponent(selected.name)}`}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
                >
                  {t("Message")}
                </Link>
              ) : (
                <Link
                  href="/member/contact"
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
                >
                  {t("Contact club")}
                </Link>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  {t("Rate this company")}
                </h3>
                <Stars value={myRating} onChange={setMyRating} />
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder={t("Optional comment")}
                  className="mt-2 min-h-[80px] w-full rounded-2xl border border-[#e4e8ee] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mvp-blue)]"
                />
                <button
                  type="button"
                  className="mt-2 h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
                  onClick={() => void submitReview()}
                >
                  {t("Submit rating")}
                </button>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("Member ratings")}
                  </h3>
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[#e8ebf0] bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarForReviewer(r.memberName)}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                          />
                          <span className="truncate text-sm font-medium text-ink">
                            {r.memberName}
                          </span>
                        </div>
                        <Stars value={r.rating} size="sm" />
                      </div>
                      {r.comment ? (
                        <p className="mt-1 text-sm text-grey">{r.comment}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {selected.calendarSharingEnabled ? (
                <div className="rounded-2xl border border-[#e8ebf0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("Shared calendar")}
                  </h3>
                  <p className="mt-1 text-[12px] text-grey">
                    {t(
                      "Pay a one-time fee so you and this company can share scheduling. Fee goes to unlock the feature.",
                    )}{" "}
                    (${(selected.calendarShareFeeCents / 100).toFixed(2)})
                  </p>
                  <button
                    type="button"
                    className="mt-3 h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
                    onClick={() => void shareCalendar(selected)}
                  >
                    {t("Enable shared calendar")}
                  </button>
                </div>
              ) : null}

              {selected.escrowEnabled ? (
                <div className="space-y-3 rounded-2xl border border-[#e8ebf0] bg-white p-4">
                  <h3 className="text-sm font-semibold text-ink">
                    {t("Pay through escrow")}
                  </h3>
                  <p className="text-[12px] text-grey">
                    {t(
                      "Your payment is held until you approve the work. If you like it, funds go to the company. If not, they stay held (disputed).",
                    )}{" "}
                    (+${(selected.escrowFeeCents / 100).toFixed(2)}{" "}
                    {t("platform fee")})
                  </p>
                  <input
                    value={escrowTitle}
                    onChange={(e) => setEscrowTitle(e.target.value)}
                    placeholder={t("Job title (e.g. Spring garden cleanup)")}
                    className={fieldClass}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey">$</span>
                    <input
                      value={escrowAmount}
                      onChange={(e) => setEscrowAmount(e.target.value)}
                      className="h-12 w-28 rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
                    />
                    <button
                      type="button"
                      className="h-12 flex-1 rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
                      onClick={() => void createEscrow(selected)}
                    >
                      {t("Pay into escrow")}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {calendars.length > 0 ? (
            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">
                {t("Your shared calendars")}
              </h2>
              <ul className="divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
                {calendars.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{c.providerName}</p>
                    <p className="mt-0.5 text-[12px] capitalize text-grey">
                      {c.status.replace("_", " ")}
                      {c.status === "pending_payment"
                        ? ` · $${(c.feeCents / 100).toFixed(2)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {jobs.length > 0 ? (
            <section>
              <h2 className="mb-2 text-[15px] font-semibold text-ink">
                {t("Escrow jobs")}
              </h2>
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4"
                  >
                    <p className="text-sm font-semibold text-ink">{job.title}</p>
                    <p className="mt-0.5 text-[12px] text-grey">
                      {job.providerName} · ${(job.amountCents / 100).toFixed(2)} + $
                      {(job.platformFeeCents / 100).toFixed(2)} fee · {job.status}
                    </p>
                    {job.status === "held" ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="h-10 flex-1 rounded-2xl bg-[var(--mvp-blue)] text-[12px] font-semibold text-white"
                          onClick={() => void escrowAction(job.id, "release")}
                        >
                          {t("Release to company")}
                        </button>
                        <button
                          type="button"
                          className="h-10 flex-1 rounded-2xl bg-[#f2f4f7] text-[12px] font-semibold text-ink"
                          onClick={() => void escrowAction(job.id, "dispute")}
                        >
                          {t("Dispute / hold")}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
