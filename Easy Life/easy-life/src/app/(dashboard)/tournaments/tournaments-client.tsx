"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, X } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { COURT_SURFACES, courtCapacityLabel, surfaceLabel } from "@/lib/court-surfaces";
import {
  bracketSeedingLabel,
  isGolfSport,
  isTennisSport,
  playerRatingLabel,
  sortPlayersForSeeding,
} from "@/lib/tournament-ratings";
import { formatMatchSlot } from "@/lib/tournament-display";
import {
  buildRounds,
  computeStandings,
  roundName,
  tiebreakerLabel,
  validWinner,
} from "@/lib/tournament-bracket";
import {
  DEFAULT_TIEBREAKERS,
  TIEBREAKER_OPTIONS,
  type TiebreakerCriterion,
} from "@/lib/tournament-tiebreakers";
import {
  DEFAULT_NO_START_POLICY,
  NO_START_DEFAULT_OPTIONS,
  noStartDefaultLabel,
  type NoStartDefault,
} from "@/lib/tournament-no-start";
import {
  type MatchScore,
  type TournamentScoresData,
  deriveTennisWinners,
  formatLeaderboardScore,
  formatTennisSetsFromBoxes,
  resolveTennisMatchWinner,
  sortGolfLeaderboard,
} from "@/lib/tournament-scores";
import {
  GolfLeaderboardEditor,
  MatchScoreInputs,
} from "@/components/tournaments/tournament-score-panel";
import { cn, formatDate } from "@/lib/utils";
import { imageForTournament } from "@/lib/brand-assets";

interface TournamentPlayer {
  id: string;
  name: string;
  memberEmail?: string | null;
  ustaRating: string | null;
  utrRating: number | null;
  handicap: number | null;
  partnerName: string | null;
  partnerEmail: string | null;
  paid: boolean;
}

interface Tournament {
  id: string;
  title: string;
  sport: string;
  courtSurface: string | null;
  date: string;
  startTime: string | null;
  format: string;
  scoringFormat: string;
  eventType: string;
  entryFee: number;
  participants: number;
  seeds: string[] | null;
  winners: Record<string, string>;
  schedule: Record<string, unknown>;
  scores: TournamentScoresData;
  tiebreakers: TiebreakerCriterion[];
  noStartDefault: NoStartDefault;
  players: TournamentPlayer[];
}

async function patchTournament(
  id: string,
  data: { seeds?: string[] | null; winners?: Record<string, string>; scores?: TournamentScoresData },
) {
  const res = await fetch("/api/tournaments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json as {
    tournament: {
      scheduleJson: string;
      winnersJson: string;
      scoresJson: string;
    } | null;
    courtBookings?: number;
  };
}

export function TournamentsClient({ initial }: { initial: Tournament[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t: tr } = useI18n();
  const [tournaments, setTournaments] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id ?? "");
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setTournaments(initial);
    setActiveId((prev) => {
      if (initial.some((t) => t.id === prev)) return prev;
      return initial[0]?.id ?? "";
    });
  }
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    sport: "Tennis",
    courtSurface: "green_clay",
    date: "",
    startTime: "09:00",
    participants: "8",
    entryFee: "25",
    scoringFormat: "Standard",
    eventType: "Singles",
    tiebreaker1: DEFAULT_TIEBREAKERS[0] as TiebreakerCriterion,
    tiebreaker2: DEFAULT_TIEBREAKERS[1] as TiebreakerCriterion,
    tiebreaker3: DEFAULT_TIEBREAKERS[2] as TiebreakerCriterion,
    noStartDefault: DEFAULT_NO_START_POLICY,
  });
  const [courtAmenities, setCourtAmenities] = useState<
    { unitCount: number; surface: string | null }[]
  >([]);

  useEffect(() => {
    fetch("/api/amenities")
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.amenities ?? []) as {
          kind: string;
          unitCount: number;
          surface: string | null;
        }[];
        setCourtAmenities(rows.filter((a) => a.kind === "court"));
      })
      .catch(() => {});
  }, []);

  const formCourtPool = useMemo(() => {
    if (form.sport !== "Tennis" || !form.courtSurface) return 0;
    return courtAmenities
      .filter((a) => a.surface === form.courtSurface)
      .reduce((sum, a) => sum + a.unitCount, 0);
  }, [courtAmenities, form.sport, form.courtSurface]);

  const activeCourtPool = useMemo(() => {
    const current = tournaments.find((x) => x.id === activeId);
    if (!current || current.sport !== "Tennis" || !current.courtSurface) return 0;
    return courtAmenities
      .filter((a) => a.surface === current.courtSurface)
      .reduce((sum, a) => sum + a.unitCount, 0);
  }, [courtAmenities, tournaments, activeId]);

  const [playerForm, setPlayerForm] = useState({
    name: "",
    memberEmail: "",
    ustaRating: "",
    utrRating: "",
    handicap: "",
    partnerName: "",
    partnerEmail: "",
    paid: false,
  });

  const active = tournaments.find((t) => t.id === activeId) ?? tournaments[0];

  const bracketWinners = useMemo(() => {
    if (!active?.seeds) return active?.winners ?? {};
    if (isTennisSport(active.sport)) {
      return deriveTennisWinners(
        active.id,
        active.seeds,
        active.scoringFormat,
        active.scores,
        active.winners,
      );
    }
    return active.winners;
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
    if (!active) return [];
    if (active.seeds) {
      return computeStandings(active.seeds, bracketWinners, active.id, {
        scores: active.scores,
        tiebreakers: active.tiebreakers,
      });
    }
    return sortPlayersForSeeding(active.sport, active.players).map((p) => ({
      name:
        active.eventType !== "Singles" && p.partnerName
          ? `${p.name} / ${p.partnerName}`
          : p.name,
      wins: 0,
      eliminated: false,
      utr: p.utrRating,
      handicap: p.handicap,
    }));
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
      metric: active.seeds ? String(r.wins) : "—",
      eliminated: r.eliminated,
    }));
  }, [active, standings]);

  useEffect(() => {
    if (!active?.seeds || !isTennisSport(active.sport)) return;
    const derived = deriveTennisWinners(
      active.id,
      active.seeds,
      active.scoringFormat,
      active.scores,
      active.winners,
    );
    if (JSON.stringify(derived) === JSON.stringify(active.winners)) return;

    void fetch("/api/tournaments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, winners: derived, scores: active.scores }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.tournament) return;
        const t = json.tournament;
        setTournaments((prev) =>
          prev.map((row) =>
            row.id === active.id
              ? {
                  ...row,
                  winners: JSON.parse(t.winnersJson) as Record<string, string>,
                  schedule: JSON.parse(t.scheduleJson) as Record<string, unknown>,
                  scores: t.scoresJson
                    ? (JSON.parse(t.scoresJson) as TournamentScoresData)
                    : row.scores,
                }
              : row,
          ),
        );
      })
      .catch(() => {});
  }, [active]);

  async function applyTournamentPatch(
    patch: { scores?: TournamentScoresData; winners?: Record<string, string> },
  ) {
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? {
              ...t,
              ...(patch.scores ? { scores: patch.scores } : {}),
              ...(patch.winners ? { winners: patch.winners } : {}),
            }
          : t,
      ),
    );
    const result = await patchTournament(activeId, patch);
    if (result?.tournament) {
      const updated = result.tournament;
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? {
                ...t,
                winners: JSON.parse(updated.winnersJson) as Record<string, string>,
                schedule: JSON.parse(updated.scheduleJson) as Record<string, unknown>,
                scores: updated.scoresJson
                  ? (JSON.parse(updated.scoresJson) as TournamentScoresData)
                  : t.scores,
              }
            : t,
        ),
      );
      if (result.courtBookings && result.courtBookings > 0) {
        toast({
          variant: "success",
          title: tr("Courts reserved"),
          description: `${result.courtBookings} ${tr("courts blocked on the amenity calendar")}`,
        });
      }
    }
  }

  async function persistScores(next: TournamentScoresData) {
    await applyTournamentPatch({ scores: next });
  }

  async function updateBracketMatch(matchId: string, patch: Partial<MatchScore>) {
    const current = active.scores.matches[matchId] ?? {};
    const merged: MatchScore = { ...current, ...patch };
    const nextScores: TournamentScoresData = {
      ...active.scores,
      matches: { ...active.scores.matches, [matchId]: merged },
    };
    const bracketMatch = rounds.flat().find((m) => m.id === matchId);
    const nextWinners = { ...active.winners };
    if (bracketMatch) {
      const resolved = resolveTennisMatchWinner(bracketMatch, merged, active.scoringFormat);
      if (resolved.complete && resolved.winner) nextWinners[matchId] = resolved.winner;
      else if (merged.matchStatus === "none" || !merged.matchStatus) delete nextWinners[matchId];
    }
    await applyTournamentPatch({ scores: nextScores, winners: nextWinners });
    if (bracketMatch) {
      const resolved = resolveTennisMatchWinner(bracketMatch, merged, active.scoringFormat);
      if (resolved.complete && resolved.winner) {
        toast({ variant: "success", title: `${resolved.winner} ${tr("advances")}` });
      }
    }
  }

  async function updateTennisMatch(matchId: string, patch: Partial<MatchScore>) {
    const current = active.scores.matches[matchId] ?? {};
    const merged: MatchScore = { ...current, ...patch };
    if (merged.sets) {
      merged.score = formatTennisSetsFromBoxes(merged.sets);
    }
    const nextScores: TournamentScoresData = {
      ...active.scores,
      matches: { ...active.scores.matches, [matchId]: merged },
    };
    const nextWinners = deriveTennisWinners(
      active.id,
      active.seeds!,
      active.scoringFormat,
      nextScores,
    );
    await applyTournamentPatch({ scores: nextScores, winners: nextWinners });

    const bracketMatch = rounds.flat().find((m) => m.id === matchId);
    if (!bracketMatch) return;
    const resolved = resolveTennisMatchWinner(bracketMatch, merged, active.scoringFormat);
    if (resolved.complete && resolved.winner) {
      toast({ variant: "success", title: `${resolved.winner} ${tr("advances")}` });
    }
  }

  async function updateMatchScore(matchId: string, value: string, side?: "p1" | "p2") {
    if (isTennisSport(active.sport)) return;
    if (!side) return;
    const current = active.scores.matches[matchId] ?? { p1: "", p2: "" };
    const next: TournamentScoresData = {
      ...active.scores,
      matches: {
        ...active.scores.matches,
        [matchId]: { ...current, [side]: value },
      },
    };
    await persistScores(next);
  }

  async function saveGolfScore(playerId: string, gross: number, net?: number) {
    const next: TournamentScoresData = {
      ...active.scores,
      leaderboard: {
        ...active.scores.leaderboard,
        [playerId]: { gross, ...(net != null ? { net } : {}), status: "played" },
      },
    };
    await persistScores(next);
    toast({ variant: "success", title: tr("Score saved") });
  }

  async function toggleGolfDidNotStart(playerId: string) {
    const current = active.scores.leaderboard[playerId];
    const next: TournamentScoresData = {
      ...active.scores,
      leaderboard: { ...active.scores.leaderboard },
    };
    if (current?.status === "did_not_start") {
      delete next.leaderboard[playerId];
    } else {
      next.leaderboard[playerId] = { status: "did_not_start" };
    }
    await persistScores(next);
    toast({
      variant: "success",
      title: current?.status === "did_not_start" ? tr("Status cleared") : tr("Marked did not start"),
    });
  }

  async function setWinner(matchId: string, player: string | null) {
    const next = { ...active.winners };
    if (player) next[matchId] = player;
    else delete next[matchId];
    await applyTournamentPatch({ winners: next });
  }

  async function pickWinner(matchId: string, player: string) {
    const current = active.winners[matchId];
    await setWinner(matchId, current === player ? null : player);
  }

  async function generateBracketFromPlayers() {
    const res = await fetch(`/api/tournaments/${activeId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_bracket" }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: tr("Need at least 2 registered players") });
      return;
    }
    const data = await res.json();
    const t = data.tournament;
    setTournaments((prev) =>
      prev.map((x) =>
        x.id === activeId
          ? {
              ...x,
              seeds: t.seedsJson ? JSON.parse(t.seedsJson) : null,
              winners: JSON.parse(t.winnersJson),
              schedule: JSON.parse(t.scheduleJson),
              scores: t.scoresJson ? JSON.parse(t.scoresJson) : { matches: {}, leaderboard: {} },
            }
          : x,
      ),
    );
    toast({
      variant: "success",
      title: `${tr("Bracket generated from")} ${tr(bracketSeedingLabel(active.sport))}`,
    });
    router.refresh();
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!playerForm.name.trim()) return;
    const res = await fetch(`/api/tournaments/${activeId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: playerForm.name,
        memberEmail: playerForm.memberEmail || undefined,
        ustaRating: isTennisSport(active.sport) ? playerForm.ustaRating || undefined : undefined,
        utrRating:
          isTennisSport(active.sport) && playerForm.utrRating
            ? Number(playerForm.utrRating)
            : undefined,
        handicap:
          isGolfSport(active.sport) && playerForm.handicap
            ? Number(playerForm.handicap)
            : undefined,
        partnerName: playerForm.partnerName || undefined,
        partnerEmail: playerForm.partnerEmail || undefined,
        paid: playerForm.paid,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: tr("Could not add player") });
      return;
    }
    const data = await res.json();
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, players: [...t.players, data.player] }
          : t,
      ),
    );
    setPlayerForm({
      name: "",
      memberEmail: "",
      ustaRating: "",
      utrRating: "",
      handicap: "",
      partnerName: "",
      partnerEmail: "",
      paid: false,
    });
    toast({
      variant: "success",
      title: tr("Player registered"),
      description: active.entryFee > 0 ? tr("Tournament entry fee added to member account") : undefined,
    });
  }

  async function removePlayer(playerId: string) {
    const res = await fetch(`/api/tournaments/${activeId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) return;
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
          : t,
      ),
    );
  }

  async function addTournament(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        sport: form.sport,
        date: form.date,
        startTime: form.startTime,
        entryFee: Number(form.entryFee) || 0,
        participants: Number(form.participants) || 8,
        scoringFormat: form.scoringFormat,
        eventType: form.eventType,
        courtSurface: form.sport === "Tennis" ? form.courtSurface : undefined,
        tiebreakers: [form.tiebreaker1, form.tiebreaker2, form.tiebreaker3],
        noStartDefault: form.noStartDefault,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: tr("Could not create tournament") });
      return;
    }
    const data = await res.json();
    setTournaments((prev) => [...prev, data.tournament]);
    setActiveId(data.tournament.id);
    setForm({
      title: "",
      sport: "Tennis",
      courtSurface: "green_clay",
      date: "",
      startTime: "09:00",
      participants: "8",
      entryFee: "25",
      scoringFormat: "Standard",
      eventType: "Singles",
      tiebreaker1: DEFAULT_TIEBREAKERS[0] as TiebreakerCriterion,
      tiebreaker2: DEFAULT_TIEBREAKERS[1] as TiebreakerCriterion,
      tiebreaker3: DEFAULT_TIEBREAKERS[2] as TiebreakerCriterion,
      noStartDefault: DEFAULT_NO_START_POLICY,
    });
    setShowForm(false);
    toast({ variant: "success", title: tr("Tournament created") });
    router.refresh();
  }

  return (
    <div>
      <ContentHeader title="Tournaments" right="logo" />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-grey">{tr("Create tournaments, register players, and run brackets")}</p>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            {showForm ? tr("Close") : tr("New tournament")}
          </Button>
        </div>

        {showForm ? (
          <Card className="mb-6">
            <CardHeader><CardTitle>{tr("New tournament")}</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-4" onSubmit={addTournament}>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">{tr("Title")}</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport">{tr("Sport")}</Label>
                  <Select id="sport" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>
                    <option>{tr("Tennis")}</option>
                    <option>{tr("Pickleball")}</option>
                    <option>{tr("Golf")}</option>
                    <option>{tr("Bocce")}</option>
                  </Select>
                </div>
                {form.sport === "Tennis" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="courtSurface">{tr("Court surface")}</Label>
                    <Select
                      id="courtSurface"
                      value={form.courtSurface}
                      onChange={(e) => setForm({ ...form, courtSurface: e.target.value })}
                    >
                      {COURT_SURFACES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {tr(s.label)}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-grey">
                      {formCourtPool > 0
                        ? `${formCourtPool} ${tr(surfaceLabel(form.courtSurface))} ${tr("courts")} ${tr("in tournament pool")} — other surfaces stay open for member bookings.`
                        : tr("No courts configured for this surface. Add them under Amenity Setup.")}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="date">{tr("Date")}</Label>
                  <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">{tr("Start time")}</Label>
                  <Input id="startTime" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">{tr("Event type")}</Label>
                  <Select id="eventType" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                    <option>{tr("Singles")}</option>
                    <option>{tr("Doubles")}</option>
                    <option>{tr("Mixed")}</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scoringFormat">{tr("Scoring")}</Label>
                  <Select id="scoringFormat" value={form.scoringFormat} onChange={(e) => setForm({ ...form, scoringFormat: e.target.value })}>
                    <option>{tr("Standard")}</option>
                    <option>{tr("Fast4")}</option>
                    <option>{tr("Best of 3")}</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryFee">{tr("Entry fee ($)")}</Label>
                  <Input id="entryFee" type="number" min={0} value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="participants">{tr("Max players")}</Label>
                  <Input id="participants" type="number" min={2} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-4">
                  <Label>{tr("Tiebreakers (when wins are equal)")}</Label>
                  <p className="text-xs text-grey">
                    {tr("Choose the 1st, 2nd, and 3rd deciders used to rank players with the same number of wins.")}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([1, 2, 3] as const).map((rank) => {
                      const key = `tiebreaker${rank}` as "tiebreaker1" | "tiebreaker2" | "tiebreaker3";
                      return (
                        <div key={rank} className="space-y-1">
                          <Label htmlFor={key} className="text-xs text-grey">
                            {rank === 1 ? tr("1st decider") : rank === 2 ? tr("2nd decider") : tr("3rd decider")}
                          </Label>
                          <Select
                            id={key}
                            value={form[key]}
                            onChange={(e) =>
                              setForm({ ...form, [key]: e.target.value as TiebreakerCriterion })
                            }
                          >
                            {TIEBREAKER_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {tr(tiebreakerLabel(opt))}
                              </option>
                            ))}
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {(form.sport === "Tennis" || form.sport === "Golf") ? (
                  <div className="space-y-2 sm:col-span-4">
                    <Label htmlFor="noStartDefault">{tr("If a match does not start")}</Label>
                    <p className="text-xs text-grey">
                      {tr("How to resolve when a player does not show or a match never begins.")}
                    </p>
                    <Select
                      id="noStartDefault"
                      value={form.noStartDefault}
                      onChange={(e) =>
                        setForm({ ...form, noStartDefault: e.target.value as NoStartDefault })
                      }
                    >
                      {NO_START_DEFAULT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {tr(noStartDefaultLabel(opt))}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <div className="sm:col-span-4">
                  <Button type="submit">{tr("Create tournament")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            {tournaments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-2 p-6 text-center">
                <p className="text-sm text-grey">{tr("No tournaments yet.")}</p>
                <p className="mt-2 text-xs text-grey">
                  {tr("Use New tournament above to create one for this club.")}
                </p>
              </div>
            ) : (
              tournaments.map((t) => {
              const tRounds = t.seeds ? buildRounds(t.id, t.seeds, t.winners) : [];
              const tChampion = tRounds.length ? validWinner(tRounds[tRounds.length - 1][0], t.winners) : null;
              const tStatus = !t.seeds ? "registration" : tChampion ? "completed" : "in_progress";
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    activeId === t.id ? "border-[var(--mvp-blue)]/40 bg-[var(--mvp-blue)]/10" : "border-border-2 hover:border-border-1",
                  )}
                >
                  <div className="flex items-center justify-between">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageForTournament(t.sport)}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                    <Badge variant={tStatus === "completed" ? "success" : tStatus === "in_progress" ? "info" : "warning"}>
                      {tr(tStatus)}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium text-ink">{tr(t.title)}</p>
                  <p className="text-xs text-grey">
                    {tr(t.sport)} · {formatDate(t.date)}
                    {t.startTime ? ` · ${t.startTime}` : ""}
                    {t.sport === "Tennis" && t.courtSurface
                      ? ` · ${tr(surfaceLabel(t.courtSurface))}`
                      : ""}
                  </p>
                  <p className="text-xs text-grey">
                    {tr(t.eventType)} · {tr(t.scoringFormat)} · {t.players.length} / {t.participants} {tr("players")}
                  </p>
                </button>
              );
            })
            )}
          </div>

          <div className="space-y-6 lg:col-span-3">
            {!active ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-grey">
                    {tr("Create a tournament or select one from the list.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {tr(active.title)} — {tr(active.eventType)} · {tr(active.scoringFormat)}
                  </CardTitle>
                  <p className="mt-1 text-xs text-grey">
                    {active.players.length} / {active.participants} {tr("registered")}
                  </p>
                  {active.sport === "Tennis" && active.courtSurface ? (
                    <p className="mt-1 text-xs text-grey">
                      {courtCapacityLabel(activeCourtPool, active.courtSurface)} in tournament pool
                      {activeCourtPool > 0
                        ? " — hard/red clay and other surfaces remain available for member bookings"
                        : ""}
                    </p>
                  ) : null}
                  {active.seeds && !isGolfSport(active.sport) ? (
                    <p className="mt-1 text-xs text-grey">
                      {tr("Tiebreakers")}:{" "}
                      {active.tiebreakers.map((tb) => tr(tiebreakerLabel(tb))).join(" → ")}
                    </p>
                  ) : null}
                  {(isTennisSport(active.sport) || isGolfSport(active.sport)) ? (
                    <p className="mt-1 text-xs text-grey">
                      {tr("If a match does not start")}: {tr(noStartDefaultLabel(active.noStartDefault))}
                    </p>
                  ) : null}
                </div>
                {champion ? <Badge variant="success">🏆 {champion}</Badge> : null}
              </CardHeader>
              <CardContent>
                {status === "registration" ? (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-3 text-sm font-medium text-ink">{tr("Registered players")}</p>
                      {active.players.length === 0 ? (
                        <p className="text-sm text-grey">{tr("No players yet — add registrations below.")}</p>
                      ) : (
                        <ul className="divide-y divide-border-2 rounded-lg border border-border-2">
                          {sortPlayersForSeeding(active.sport, active.players).map((p) => (
                              <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div>
                                  <span className="font-medium text-ink">{p.name}</span>
                                  {p.partnerName ? (
                                    <span className="text-grey"> / {p.partnerName}</span>
                                  ) : null}
                                  <span className="ml-2 text-xs text-grey">
                                    {playerRatingLabel(active.sport, p)}
                                    {playerRatingLabel(active.sport, p) && p.paid ? " · " : ""}
                                    {p.paid ? tr("Paid") : ""}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePlayer(p.id)}
                                  className="rounded p-1 text-grey hover:text-danger"
                                  aria-label={`Remove ${p.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>

                    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={addPlayer}>
                      <Input
                        placeholder={tr("Player name")}
                        value={playerForm.name}
                        onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      />
                      <Input
                        placeholder={tr("Email")}
                        type="email"
                        value={playerForm.memberEmail}
                        onChange={(e) => setPlayerForm({ ...playerForm, memberEmail: e.target.value })}
                      />
                      {active.eventType !== "Singles" ? (
                        <>
                          <Input
                            placeholder={tr("Partner name")}
                            value={playerForm.partnerName}
                            onChange={(e) =>
                              setPlayerForm({ ...playerForm, partnerName: e.target.value })
                            }
                          />
                          <Input
                            placeholder={tr("Partner email (court SMS)")}
                            type="email"
                            value={playerForm.partnerEmail}
                            onChange={(e) =>
                              setPlayerForm({ ...playerForm, partnerEmail: e.target.value })
                            }
                          />
                        </>
                      ) : null}
                      {isTennisSport(active.sport) ? (
                        <>
                          <Input
                            placeholder="USTA NTRP (e.g. 4.0)"
                            value={playerForm.ustaRating}
                            onChange={(e) => setPlayerForm({ ...playerForm, ustaRating: e.target.value })}
                          />
                          <Input
                            placeholder="UTR (e.g. 8.5)"
                            type="number"
                            step="0.1"
                            value={playerForm.utrRating}
                            onChange={(e) => setPlayerForm({ ...playerForm, utrRating: e.target.value })}
                          />
                        </>
                      ) : null}
                      {isGolfSport(active.sport) ? (
                        <Input
                          placeholder="Handicap index (e.g. 12.4)"
                          type="number"
                          step="0.1"
                          value={playerForm.handicap}
                          onChange={(e) => setPlayerForm({ ...playerForm, handicap: e.target.value })}
                        />
                      ) : null}
                      <label className="flex items-center gap-2 text-sm text-grey">
                        <input
                          type="checkbox"
                          checked={playerForm.paid}
                          onChange={(e) => setPlayerForm({ ...playerForm, paid: e.target.checked })}
                        />
                        {tr("Entry fee paid")}
                      </label>
                      <Button type="submit" variant="secondary">
                        <UserPlus className="h-4 w-4" />
                        {tr("Add player")}
                      </Button>
                    </form>

                    <div className="rounded-lg border border-dashed border-border-1 bg-sidebar p-6 text-center">
                      <p className="text-sm text-grey">
                        {active.players.length} {tr("registered — generate bracket seeded by")}{" "}
                        {tr(bracketSeedingLabel(active.sport))} {tr("when ready.")}
                      </p>
                      <Button
                        className="mt-4"
                        variant="secondary"
                        disabled={active.players.length < 2}
                        onClick={generateBracketFromPlayers}
                      >
                        {tr("Generate bracket")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-grey">
                      {isGolfSport(active.sport)
                        ? tr("Enter gross and net scores on the leaderboard below.")
                        : isTennisSport(active.sport)
                          ? tr("Enter set scores in each box. Use Did not start when a match never begins.")
                          : tr("Enter match scores and click a player to set the winner; click again to undo.")}
                    </p>
                    <div className="flex gap-6 overflow-x-auto pb-2">
                      {rounds.map((round, ri) => (
                        <div key={ri} className="min-w-[200px] flex-1">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-grey">
                            {roundName(ri, rounds.length, tr)}
                          </p>
                          <div className="flex h-full flex-col justify-around gap-4">
                            {round.map((m) => {
                              const w = validWinner(m, bracketWinners);
                              const time = formatMatchSlot(
                                active.schedule[m.id] as Parameters<typeof formatMatchSlot>[0],
                                active.sport,
                              );
                              return (
                                <div key={m.id}>
                                  {time ? (
                                    <p className="mb-1 px-2 text-[10px] text-grey">{time}</p>
                                  ) : null}
                                  <MatchScoreInputs
                                    match={m}
                                    sport={active.sport}
                                    scoringFormat={active.scoringFormat}
                                    scores={active.scores.matches[m.id]}
                                    winner={w}
                                    seeds={active.seeds ?? []}
                                    noStartDefault={active.noStartDefault}
                                    onScoreChange={updateMatchScore}
                                    onTennisUpdate={updateTennisMatch}
                                    onMatchUpdate={updateBracketMatch}
                                    onPickWinner={pickWinner}
                                    t={tr}
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
              </CardContent>
            </Card>

            {isGolfSport(active.sport) && active.players.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{tr("Golf leaderboard")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <GolfLeaderboardEditor
                    players={sortPlayersForSeeding(active.sport, active.players)}
                    scores={active.scores}
                    onSave={saveGolfScore}
                    onMarkDidNotStart={toggleGolfDidNotStart}
                    t={tr}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader><CardTitle>{tr("Standings")}</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-2 text-left text-xs text-grey">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">{tr("Player / Team")}</th>
                      {isGolfSport(active.sport) ? (
                        <th className="pb-2 font-medium">{tr("Score")}</th>
                      ) : (
                        <th className="pb-2 font-medium">{tr("Wins")}</th>
                      )}
                      <th className="pb-2 font-medium">{tr("Status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standingsRows.map((row, i) => (
                      <tr key={row.name} className="border-b border-border-2 last:border-0">
                        <td className="py-2 text-grey">{i + 1}</td>
                        <td className="py-2 font-medium text-ink">{row.name}</td>
                        <td className="py-2">{row.metric}</td>
                        <td className="py-2">
                          {active.seeds ? (
                            row.eliminated ? (
                              <Badge variant="warning">{tr("Out")}</Badge>
                            ) : champion === row.name ? (
                              <Badge variant="success">{tr("Champion")}</Badge>
                            ) : (
                              <Badge variant="info">{tr("Active")}</Badge>
                            )
                          ) : (
                            <Badge variant="info">{tr("Registered")}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
