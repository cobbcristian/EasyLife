"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MatchScoreReadonly } from "@/components/tournaments/tournament-score-panel";
import { surfaceLabel } from "@/lib/court-surfaces";
import { useI18n } from "@/lib/i18n";
import {
  buildRounds,
  bracketWinnersForTournament,
  computeStandings,
  roundName,
  validWinner,
} from "@/lib/tournament-bracket";
import type { TiebreakerCriterion } from "@/lib/tournament-tiebreakers";
import { isGolfSport, sortPlayersForSeeding } from "@/lib/tournament-ratings";
import { formatMatchSlot, findNextMatchForPlayer, type MatchSlot } from "@/lib/tournament-display";
import {
  formatLeaderboardScore,
  sortGolfLeaderboard,
  type TournamentScoresData,
} from "@/lib/tournament-scores";
import { cn, formatDate } from "@/lib/utils";
import { imageForTournament } from "@/lib/brand-assets";

export interface MemberTournament {
  id: string;
  title: string;
  sport: string;
  courtSurface: string | null;
  date: string;
  startTime: string | null;
  scoringFormat: string;
  eventType: string;
  participants: number;
  seeds: string[] | null;
  winners: Record<string, string>;
  schedule: Record<string, unknown>;
  scores: TournamentScoresData;
  tiebreakers: TiebreakerCriterion[];
  players: {
    id: string;
    name: string;
    memberEmail?: string | null;
    partnerName: string | null;
    handicap: number | null;
  }[];
}

function statusLabel(status: string, t: (k: string) => string) {
  return t(status);
}

function statusTone(status: string) {
  if (status === "completed") return "text-[var(--mvp-status-going)]";
  if (status === "in_progress") return "text-[var(--mvp-blue)]";
  return "text-[var(--mvp-status-pending)]";
}

export function MemberTournamentsClient({
  memberEmail,
}: {
  avatarName: string;
  memberEmail: string;
}) {
  const { t } = useI18n();
  const [tournaments, setTournaments] = useState<MemberTournament[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.tournaments ?? []) as MemberTournament[];
        setTournaments(rows);
        setActiveId((prev) => prev || rows[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetch("/api/tournaments")
        .then((r) => r.json())
        .then((d) => {
          const rows = (d.tournaments ?? []) as MemberTournament[];
          setTournaments(rows);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const active = tournaments.find((row) => row.id === activeId) ?? tournaments[0];

  const bracketWinners = useMemo(() => {
    if (!active) return {};
    return bracketWinnersForTournament(active);
  }, [active]);

  const rounds = useMemo(
    () => (active?.seeds ? buildRounds(active.id, active.seeds, bracketWinners) : []),
    [active, bracketWinners],
  );

  const champion =
    rounds.length && active
      ? validWinner(rounds[rounds.length - 1][0], bracketWinners)
      : null;

  const status = !active
    ? "registration"
    : !active.seeds
      ? "registration"
      : champion
        ? "completed"
        : "in_progress";

  const standings = useMemo(() => {
    if (!active?.seeds) return [];
    return computeStandings(active.seeds, bracketWinners, active.id, {
      scores: active.scores,
      tiebreakers: active.tiebreakers,
    });
  }, [active, bracketWinners]);

  const standingsRows = useMemo(() => {
    if (!active) return [];
    if (isGolfSport(active.sport)) {
      return sortGolfLeaderboard(active.players, active.scores.leaderboard).map((r) => ({
        name: r.name,
        metric: formatLeaderboardScore(active.sport, r.entry),
        eliminated: false,
      }));
    }
    return standings.map((r) => ({
      name: r.name,
      metric: String(r.wins),
      eliminated: r.eliminated,
    }));
  }, [active, standings]);

  const myNextMatch = useMemo(() => {
    if (!active?.seeds || !memberEmail) return null;
    const player = active.players.find(
      (p) => p.memberEmail?.toLowerCase() === memberEmail.toLowerCase(),
    );
    if (!player) return null;
    const playerName =
      active.eventType !== "Singles" && player.partnerName
        ? `${player.name} / ${player.partnerName}`
        : player.name;
    return findNextMatchForPlayer(
      rounds,
      bracketWinners,
      playerName,
      active.schedule as Record<string, MatchSlot | string>,
      active.sport,
    );
  }, [active, rounds, bracketWinners, memberEmail]);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-3xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Tournaments & Events")}
          </h1>
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {tournaments.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No tournaments scheduled.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Check back soon, or browse Activities while you wait.")}
              </p>
              <Link
                href="/member/activities"
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {t("Browse Activities")}
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[#eceff3]">
                {tournaments.map((event) => {
                  const eventRounds = event.seeds
                    ? buildRounds(event.id, event.seeds, bracketWinnersForTournament(event))
                    : [];
                  const eventChampion = eventRounds.length
                    ? validWinner(
                        eventRounds[eventRounds.length - 1][0],
                        bracketWinnersForTournament(event),
                      )
                    : null;
                  const eventStatus = !event.seeds
                    ? "registration"
                    : eventChampion
                      ? "completed"
                      : "in_progress";
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(event.id)}
                        className={cn(
                          "flex w-full items-center gap-3 py-3.5 text-left",
                          activeId === event.id ? "opacity-100" : "opacity-80",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageForTournament(event.sport)}
                          alt=""
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-ink">
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-grey">
                            {t(event.sport)} · {formatDate(event.date)}
                            {event.startTime ? ` · ${event.startTime}` : ""} ·{" "}
                            {event.players.length} / {event.participants} {t("players")}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-semibold capitalize",
                            statusTone(eventStatus),
                            activeId === event.id &&
                              "rounded-full bg-[var(--mvp-blue)]/10 px-2 py-1 text-[var(--mvp-blue)]",
                          )}
                        >
                          {statusLabel(eventStatus, t)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {active ? (
                <section className="space-y-4 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[15px] font-semibold text-ink">
                        {active.title}
                      </h2>
                      <p className="mt-1 text-[12px] text-grey">
                        {t(active.eventType)} · {t(active.scoringFormat)} ·{" "}
                        {formatDate(active.date)}
                        {active.startTime ? ` · ${active.startTime}` : ""}
                        {active.sport === "Tennis" && active.courtSurface
                          ? ` · ${t(surfaceLabel(active.courtSurface))}`
                          : ""}
                      </p>
                      <p className="mt-0.5 text-[12px] text-grey">
                        {active.players.length} / {active.participants} {t("registered")}
                      </p>
                    </div>
                    {champion ? (
                      <span className="shrink-0 text-[11px] font-semibold text-[var(--mvp-status-going)]">
                        {champion}
                      </span>
                    ) : (
                      <span className={cn("text-[11px] font-semibold capitalize", statusTone(status))}>
                        {statusLabel(status, t)}
                      </span>
                    )}
                  </div>

                  {myNextMatch ? (
                    <div className="rounded-xl border border-[var(--mvp-blue)]/20 bg-[var(--mvp-blue)]/5 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                        {t("Your next match")}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-ink">
                        {active.sport.toLowerCase() === "tennis" && myNextMatch.courtLabel
                          ? myNextMatch.courtLabel
                          : myNextMatch.courtLabel || t("Match")}
                        {myNextMatch.time ? ` · ${myNextMatch.time}` : ""}
                      </p>
                      <p className="mt-0.5 text-[13px] text-grey">
                        {t("vs")} {myNextMatch.opponent}
                      </p>
                    </div>
                  ) : null}

                  {status === "registration" ? (
                    <div>
                      <p className="mb-2 text-sm text-grey">{t("Registration open")}</p>
                      {active.players.length > 0 ? (
                        <ul className="divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0] bg-white">
                          {sortPlayersForSeeding(active.sport, active.players).map((p) => (
                            <li key={p.id} className="px-3 py-2.5 text-sm font-medium text-ink">
                              {p.name}
                              {p.partnerName ? ` / ${p.partnerName}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-grey">{t("No players registered yet.")}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-[12px] text-grey">
                        {t("Match schedule and live scores — updated as results are entered.")}
                      </p>
                      <div className="flex gap-4 overflow-x-auto pb-1">
                        {rounds.map((round, ri) => (
                          <div key={ri} className="min-w-[180px] flex-1">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-grey">
                              {roundName(ri, rounds.length, t)}
                            </p>
                            <div className="flex flex-col gap-3">
                              {round.map((m) => {
                                const w = validWinner(m, bracketWinners);
                                const time = formatMatchSlot(
                                  active.schedule[m.id] as Parameters<typeof formatMatchSlot>[0],
                                  active.sport,
                                );
                                return (
                                  <div key={m.id}>
                                    {time ? (
                                      <p className="mb-1 px-1 text-[10px] text-grey">{time}</p>
                                    ) : null}
                                    <MatchScoreReadonly
                                      match={m}
                                      sport={active.sport}
                                      scoringFormat={active.scoringFormat}
                                      scores={active.scores.matches[m.id]}
                                      winner={w}
                                      t={t}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {isGolfSport(active.sport) && active.players.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-ink">
                        {t("Leaderboard")}
                      </h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#eceff3] text-left text-[11px] text-grey">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">{t("Player / Team")}</th>
                            <th className="pb-2 font-medium">{t("Score")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortGolfLeaderboard(active.players, active.scores.leaderboard).map(
                            (row, i) => (
                              <tr
                                key={row.id}
                                className="border-b border-[#eceff3] last:border-0"
                              >
                                <td className="py-2 text-grey">{i + 1}</td>
                                <td className="py-2 font-medium text-ink">{row.name}</td>
                                <td className="py-2">
                                  {formatLeaderboardScore(active.sport, row.entry)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {active.seeds ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-ink">
                        {t("Standings")}
                      </h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#eceff3] text-left text-[11px] text-grey">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">{t("Player / Team")}</th>
                            <th className="pb-2 font-medium">
                              {isGolfSport(active.sport) ? t("Score") : t("Wins")}
                            </th>
                            <th className="pb-2 font-medium">{t("Status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standingsRows.map((row, i) => (
                            <tr
                              key={row.name}
                              className="border-b border-[#eceff3] last:border-0"
                            >
                              <td className="py-2 text-grey">{i + 1}</td>
                              <td className="py-2 font-medium text-ink">{row.name}</td>
                              <td className="py-2">{row.metric}</td>
                              <td className="py-2 text-[11px] font-semibold">
                                {row.eliminated ? (
                                  <span className="text-[var(--mvp-status-pending)]">
                                    {t("Out")}
                                  </span>
                                ) : champion === row.name ? (
                                  <span className="text-[var(--mvp-status-going)]">
                                    {t("Champion")}
                                  </span>
                                ) : (
                                  <span className="text-[var(--mvp-blue)]">{t("Active")}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
