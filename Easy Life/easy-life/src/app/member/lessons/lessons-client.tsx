"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type LessonSport = "tennis" | "golf" | "pickleball";
type Pro = { id: string; name: string; category: string; description: string };
type Lesson = {
  id: string;
  providerName: string;
  offeringName: string;
  sport: string;
  date: string;
  startTime: string;
  endTime: string;
  fee: number;
  status: string;
};

type ProsPayload = { tennis?: Pro[]; golf?: Pro[]; pickleball?: Pro[] };

function prosForSport(sport: LessonSport, d: { pros?: ProsPayload }): Pro[] {
  if (sport === "tennis") return d.pros?.tennis ?? [];
  if (sport === "golf") return d.pros?.golf ?? [];
  return d.pros?.pickleball ?? [];
}

function sportsFromPayload(d: { pros?: ProsPayload }): LessonSport[] {
  const next: LessonSport[] = [];
  if ((d.pros?.tennis?.length ?? 0) > 0) next.push("tennis");
  if ((d.pros?.pickleball?.length ?? 0) > 0) next.push("pickleball");
  if ((d.pros?.golf?.length ?? 0) > 0) next.push("golf");
  return next.length > 0 ? next : ["tennis"];
}

function sportTabLabel(sport: LessonSport): string {
  switch (sport) {
    case "tennis":
      return "Tennis";
    case "golf":
      return "Golf";
    case "pickleball":
      return "Pickleball";
    default: {
      const _exhaustive: never = sport;
      return _exhaustive;
    }
  }
}

export function MemberLessonsClient() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [sport, setSport] = useState<LessonSport>("tennis");
  const [availableSports, setAvailableSports] = useState<LessonSport[]>(["tennis"]);
  const [pros, setPros] = useState<Pro[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [providerId, setProviderId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [onCourse, setOnCourse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function applyProsPayload(
    d: { lessons?: Lesson[]; pros?: ProsPayload },
    preferred?: LessonSport,
  ) {
    setLessons(d.lessons ?? []);
    const sports = sportsFromPayload(d);
    setAvailableSports(sports);
    const nextSport =
      preferred && sports.includes(preferred) ? preferred : (sports[0] ?? "tennis");
    setSport(nextSport);
    const list = prosForSport(nextSport, d);
    setPros(list);
    setProviderId(list[0]?.id || "");
  }

  function load() {
    return fetch("/api/member/lessons")
      .then((r) => r.json())
      .then((d) => applyProsPayload(d, sport))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let on = true;
    fetch("/api/member/lessons")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        applyProsPayload(d);
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
    // Initial mount only; sport changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!availableSports.includes(sport)) return;
    fetch(`/api/member/lessons?sport=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        const list = prosForSport(sport, d);
        setPros(list);
        setProviderId(list[0]?.id ?? "");
        if (Array.isArray(d.lessons)) setLessons(d.lessons);
      })
      .catch(() => {});
  }, [sport, availableSports]);

  const selectedPro = useMemo(
    () => pros.find((p) => p.id === providerId),
    [pros, providerId],
  );

  async function bookLesson() {
    if (!providerId) {
      toast({ variant: "warning", title: t("Select a pro") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/member/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        sport,
        date,
        startTime,
        onCourse: sport === "golf" ? onCourse : false,
        durationMinutes: 60,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not book lesson") });
      return;
    }
    if (data.needsPayment && data.chargeId) {
      toast({
        variant: "success",
        title: t("Lesson reserved — complete payment to confirm"),
      });
      try {
        const payRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: data.amount,
            description: data.description ?? "Lesson",
            returnPath: "/member/lessons",
            chargeId: data.chargeId,
          }),
        });
        const pay = await payRes.json().catch(() => ({}));
        if (payRes.ok && pay.url) {
          window.location.href = pay.url;
          return;
        }
        if (payRes.ok && pay.paid) {
          toast({
            variant: "success",
            title: t("Lesson booked — court reserved"),
          });
          load();
          return;
        }
      } catch {
        /* fall through to payments list */
      }
      window.location.href = "/member/payments";
      return;
    }
    const successTitle =
      sport === "tennis" || sport === "pickleball"
        ? t("Lesson booked — court reserved")
        : onCourse
          ? t("Lesson booked — tee time reserved")
          : t("Lesson booked — range lane reserved");
    toast({
      variant: "success",
      title: successTitle,
    });
    load();
  }

  if (loading) {
    return <p className="p-6 text-sm text-grey">{t("Loading…")}</p>;
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          {t("Member")}
        </p>
        <h1 className="text-[22px] font-semibold text-ink">{t("Private Lessons")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t("Book a club pro. Court or practice lane is held automatically.")}
        </p>

        <div className="mt-5 space-y-3 rounded-2xl border border-[#e8ebf0] p-4">
          <div className="flex gap-2">
            {availableSports.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSport(s)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                  sport === s
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f4f6f8] text-ink"
                }`}
              >
                {t(sportTabLabel(s))}
              </button>
            ))}
          </div>

          <label className="block text-xs font-medium text-grey">
            {t("Choose your pro")}
            <select
              className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
            >
              {pros.length === 0 ? (
                <option value="">{t("No pros available")}</option>
              ) : (
                pros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
          {selectedPro?.description ? (
            <p className="text-xs text-grey">{selectedPro.description}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-grey">
              {t("Date")}
              <input
                type="date"
                className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block text-xs font-medium text-grey">
              {t("Start")}
              <input
                type="time"
                className="mt-1 h-11 w-full rounded-xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
          </div>

          {sport === "golf" ? (
            <label className="flex items-center justify-between gap-3 rounded-xl bg-[#fafbfc] px-3 py-3 text-sm">
              <span>{t("On-course lesson (books a tee time)")}</span>
              <input
                type="checkbox"
                checked={onCourse}
                onChange={(e) => setOnCourse(e.target.checked)}
                className="h-4 w-4 accent-[var(--mvp-blue)]"
              />
            </label>
          ) : null}

          <button
            type="button"
            disabled={busy || !providerId}
            onClick={bookLesson}
            className="h-11 w-full rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("Booking…") : t("Book lesson")}
          </button>
        </div>

        <h2 className="mt-8 text-[15px] font-semibold">{t("Your lessons")}</h2>
        <ul className="mt-3 divide-y divide-[#eceff3]">
          {lessons.length === 0 ? (
            <li className="rounded-xl bg-[#f7f8fa] px-4 py-5 text-center">
              <p className="text-sm font-semibold text-ink">{t("No lessons booked yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Choose a pro and time above to book your first lesson.")}
              </p>
              <a
                href="/member/vendors"
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Browse pros")}
              </a>
            </li>
          ) : (
            lessons.map((l) => (
              <li key={l.id} className="py-3">
                <p className="text-sm font-medium text-ink">{l.offeringName}</p>
                <p className="text-xs text-grey">
                  {l.providerName} · {formatDate(l.date)} · {l.startTime}–{l.endTime}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--mvp-blue)]">
                  {formatCurrency(l.fee)} · {t(l.status)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
