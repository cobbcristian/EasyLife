"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BracketMatch } from "@/lib/tournament-bracket";
import {
  noStartDefaultLabel,
  noStartWinnerName,
  noStartWinnerSide,
  type NoStartDefault,
} from "@/lib/tournament-no-start";
import { isGolfSport, isTennisSport } from "@/lib/tournament-ratings";
import {
  type MatchScore,
  type TennisMatchStatus,
  type TournamentScoresData,
  formatTennisSetsFromBoxes,
  matchScorePlaceholder,
  normalizeTennisSets,
  parseTennisMatchScore,
  resolveTennisMatchWinner,
  tennisMatchNeedsWinnerPick,
  tennisMatchStatusLabel,
  tennisScoreWinnerSide,
  visibleTennisSetColumns,
} from "@/lib/tournament-scores";

function isWinner(player: string | null, winner: string | null): boolean {
  return Boolean(player && winner && winner === player);
}

export function MatchScoreReadonly({
  match,
  sport,
  scoringFormat,
  scores,
  winner,
  t,
}: {
  match: BracketMatch;
  sport: string;
  scoringFormat: string;
  scores: MatchScore | undefined;
  winner: string | null;
  t: (key: string) => string;
}) {
  const tennis = isTennisSport(sport);
  const sets = tennis ? normalizeTennisSets(scores, scoringFormat) : null;
  const visibleSets = sets ? visibleTennisSetColumns(sets, scoringFormat) : 0;
  const status = scores?.matchStatus ?? "none";

  return (
    <div className="rounded-lg border border-border-2 p-2">
      {tennis && sets ? (
        <>
          {status !== "none" ? (
            <p className="mb-2 text-[10px] font-medium uppercase text-[var(--mvp-blue)]">
              {t(tennisMatchStatusLabel(status))}
              {scores?.statusDetail ? ` · ${scores.statusDetail}` : ""}
            </p>
          ) : null}
          <div
            className="grid items-center gap-x-1 gap-y-1 text-xs"
            style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${visibleSets}, 2.5rem)` }}
          >
            <div aria-hidden className="h-3" />
            {Array.from({ length: visibleSets }, (_, i) => (
              <span
                key={`hdr-${i}`}
                className="text-center text-[9px] font-semibold uppercase text-grey"
              >
                {t("Set")} {i + 1}
              </span>
            ))}
            <span
              className={cn(
                "truncate font-medium",
                isWinner(match.p1, winner) ? "text-[var(--mvp-blue)]" : "text-ink",
              )}
            >
              {match.p1 ?? t("TBD")}
            </span>
            {sets.p1.slice(0, visibleSets).map((val, i) => (
              <span key={`p1-${i}`} className="text-center font-semibold text-ink">
                {val || "—"}
              </span>
            ))}
            <span
              className={cn(
                "truncate",
                isWinner(match.p2, winner) ? "font-medium text-[var(--mvp-blue)]" : "text-gray-2",
              )}
            >
              {match.p2 ?? t("TBD")}
            </span>
            {sets.p2.slice(0, visibleSets).map((val, i) => (
              <span key={`p2-${i}`} className="text-center text-gray-2">
                {val || "—"}
              </span>
            ))}
          </div>
        </>
      ) : (
        (["p1", "p2"] as const).map((side) => {
          const player = side === "p1" ? match.p1 : match.p2;
          const won = isWinner(player, winner);
          const lost = Boolean(player && winner && winner !== player);
          const sideScore = side === "p1" ? scores?.p1 : scores?.p2;
          return (
            <div
              key={side}
              className={cn(
                "flex items-center justify-between rounded px-2 py-1.5 text-sm",
                won
                  ? "bg-[var(--mvp-blue)] font-medium text-white"
                  : lost
                    ? "text-grey-light line-through opacity-60"
                    : player && !player.startsWith("BYE")
                      ? "text-ink"
                      : "text-grey-light",
              )}
            >
              <span className="truncate">{player ?? t("TBD")}</span>
              <span className="ml-2 flex shrink-0 items-center gap-2">
                {sideScore ? (
                  <span className={cn("text-xs", won ? "text-white/90" : "text-grey")}>{sideScore}</span>
                ) : null}
                {won ? (
                  <span className="rounded bg-white/20 px-1.5 text-[10px] font-semibold uppercase">
                    {t("Winner")}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })
      )}
      {winner && tennis ? (
        <p className="mt-0.5 px-2 text-[11px] font-medium text-[var(--mvp-blue)]">
          {winner} {t("advances")}
        </p>
      ) : null}
    </div>
  );
}

export function MatchScoreInputs({
  match,
  sport,
  scoringFormat,
  scores,
  winner,
  seeds,
  noStartDefault,
  onScoreChange,
  onTennisUpdate,
  onMatchUpdate,
  onPickWinner,
  t,
}: {
  match: BracketMatch;
  sport: string;
  scoringFormat: string;
  scores: MatchScore | undefined;
  winner: string | null;
  seeds: string[];
  noStartDefault: NoStartDefault;
  onScoreChange: (matchId: string, value: string, side?: "p1" | "p2") => void;
  onTennisUpdate?: (matchId: string, patch: Partial<MatchScore>) => void;
  onMatchUpdate?: (matchId: string, patch: Partial<MatchScore>) => void;
  onPickWinner: (matchId: string, player: string) => void;
  t: (key: string) => string;
}) {
  const placeholder = matchScorePlaceholder(sport, scoringFormat);
  const tennis = isTennisSport(sport);

  if (tennis) {
    return (
      <TennisMatchScoreEditor
        match={match}
        scoringFormat={scoringFormat}
        scores={scores}
        winner={winner}
        seeds={seeds}
        noStartDefault={noStartDefault}
        onUpdate={(patch) => onTennisUpdate?.(match.id, patch)}
        t={t}
      />
    );
  }

  const sides: ("p1" | "p2")[] = ["p1", "p2"];

  return (
    <div className="rounded-lg border border-border-2 p-2">
      {sides.map((side) => {
        const player = side === "p1" ? match.p1 : match.p2;
        const scoreVal = side === "p1" ? scores?.p1 ?? "" : scores?.p2 ?? "";
        return (
          <div key={side} className="mb-1 last:mb-0">
            <button
              type="button"
              disabled={!player || player.startsWith("BYE")}
              onClick={() => player && onPickWinner(match.id, player)}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors",
                isWinner(player, winner)
                  ? "bg-[var(--mvp-blue)] font-medium text-white"
                  : player && !player.startsWith("BYE")
                    ? "text-ink hover:bg-[var(--mvp-blue)]/10"
                    : "text-grey-light",
              )}
            >
              <span className="truncate">{player ?? t("TBD")}</span>
              {isWinner(player, winner) ? <Check className="h-3 w-3" /> : null}
            </button>
            {player && !player.startsWith("BYE") && !isGolfSport(sport) ? (
              <Input
                className="mt-1 h-8 text-xs"
                placeholder={placeholder}
                value={scoreVal}
                onChange={(e) => onScoreChange(match.id, e.target.value, side)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
          </div>
        );
      })}
      {!isGolfSport(sport) ? (
        <MatchOutcomeControls
          match={match}
          scores={scores}
          seeds={seeds}
          noStartDefault={noStartDefault}
          onUpdate={(patch) => onMatchUpdate?.(match.id, patch)}
          t={t}
        />
      ) : null}
    </div>
  );
}

const TENNIS_STATUS_OPTIONS: TennisMatchStatus[] = [
  "none",
  "complete",
  "did_not_start",
  "walkover",
  "default",
  "retirement",
  "other",
  "withdrawal",
];

const OUTCOME_STATUS_OPTIONS: TennisMatchStatus[] = [
  "none",
  "did_not_start",
  "walkover",
  "default",
  "withdrawal",
];

function MatchNoStartControls({
  match,
  scores,
  seeds,
  noStartDefault,
  onUpdate,
  t,
}: {
  match: BracketMatch;
  scores: MatchScore | undefined;
  seeds: string[];
  noStartDefault: NoStartDefault;
  onUpdate: (patch: Partial<MatchScore>) => void;
  t: (key: string) => string;
}) {
  const autoWinner = noStartWinnerName(match, seeds, noStartDefault);

  function markDidNotStart() {
    const side = noStartWinnerSide(match, seeds, noStartDefault);
    onUpdate({
      matchStatus: "did_not_start",
      statusWinner: side ?? scores?.statusWinner,
      statusDetail: undefined,
    });
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border-2 pt-2">
      <button
        type="button"
        onClick={markDidNotStart}
        className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
      >
        {t("Did not start")}
        {autoWinner ? ` — ${autoWinner} ${t("advances")}` : ""}
      </button>
      {noStartDefault !== "manual" ? (
        <p className="text-[10px] text-grey">
          {t("Tournament rule")}: {t(noStartDefaultLabel(noStartDefault))}
        </p>
      ) : null}
    </div>
  );
}

function MatchOutcomeControls({
  match,
  scores,
  seeds,
  noStartDefault,
  onUpdate,
  t,
  options = OUTCOME_STATUS_OPTIONS,
}: {
  match: BracketMatch;
  scores: MatchScore | undefined;
  seeds: string[];
  noStartDefault: NoStartDefault;
  onUpdate: (patch: Partial<MatchScore>) => void;
  t: (key: string) => string;
  options?: TennisMatchStatus[];
}) {
  const matchStatus = scores?.matchStatus ?? "none";

  function updateStatus(status: TennisMatchStatus) {
    if (status === "none") {
      onUpdate({ matchStatus: "none", statusDetail: undefined, statusWinner: undefined });
      return;
    }
    const autoSide =
      status === "did_not_start" || status === "default"
        ? noStartWinnerSide(match, seeds, noStartDefault)
        : null;
    onUpdate({
      matchStatus: status,
      statusDetail: status === "retirement" ? scores?.statusDetail ?? "Injury" : undefined,
      statusWinner: autoSide ?? scores?.statusWinner,
    });
  }

  return (
    <>
      <div className="mt-2 space-y-2 border-t border-border-2 pt-2">
        <label className="block text-[10px] font-semibold uppercase text-grey">
          {t("Match status")}
        </label>
        <select
          value={matchStatus}
          onChange={(e) => updateStatus(e.target.value as TennisMatchStatus)}
          className="h-8 w-full rounded-lg border border-border-1 bg-white px-2 text-xs"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {t(tennisMatchStatusLabel(opt))}
            </option>
          ))}
        </select>

        {matchStatus !== "none" ? (
          <select
            value={scores?.statusWinner ?? ""}
            onChange={(e) =>
              onUpdate({
                statusWinner:
                  e.target.value === "p1" || e.target.value === "p2"
                    ? (e.target.value as "p1" | "p2")
                    : undefined,
              })
            }
            className="h-8 w-full rounded-lg border border-border-1 bg-white px-2 text-xs"
          >
            <option value="">{t("Select winner")}</option>
            <option value="p1">{match.p1}</option>
            <option value="p2">{match.p2}</option>
          </select>
        ) : null}
      </div>
      <MatchNoStartControls
        match={match}
        scores={scores}
        seeds={seeds}
        noStartDefault={noStartDefault}
        onUpdate={onUpdate}
        t={t}
      />
    </>
  );
}

const RETIREMENT_DETAILS = ["Injury", "Illness", "Other"];

function TennisMatchScoreEditor({
  match,
  scoringFormat,
  scores,
  winner,
  seeds,
  noStartDefault,
  onUpdate,
  t,
}: {
  match: BracketMatch;
  scoringFormat: string;
  scores: MatchScore | undefined;
  winner: string | null;
  seeds: string[];
  noStartDefault: NoStartDefault;
  onUpdate: (patch: Partial<MatchScore>) => void;
  t: (key: string) => string;
}) {
  const sets = normalizeTennisSets(scores, scoringFormat);
  const visibleSets = visibleTennisSetColumns(sets, scoringFormat);
  const matchStatus = scores?.matchStatus ?? "none";
  const scoreText = formatTennisSetsFromBoxes(sets);
  const parsed = scoreText ? parseTennisMatchScore(scoreText, scoringFormat) : null;
  const resolved = resolveTennisMatchWinner(match, scores, scoringFormat);
  const autoStatusWinner =
    matchStatus === "did_not_start" || matchStatus === "default"
      ? noStartWinnerSide(match, seeds, noStartDefault)
      : null;
  const scoreWinnerSide = tennisScoreWinnerSide(scoreText, scoringFormat);
  const needsWinnerPick = tennisMatchNeedsWinnerPick(
    matchStatus,
    scoreText,
    scoringFormat,
    autoStatusWinner,
  );
  const inferredWinnerSide =
    scores?.statusWinner ?? scoreWinnerSide ?? autoStatusWinner ?? null;
  const setGridCols = `minmax(0,1fr) repeat(${visibleSets}, 2.5rem)`;

  function updateSet(side: "p1" | "p2", setIndex: number, value: string) {
    const next = normalizeTennisSets(scores, scoringFormat);
    next[side][setIndex] = value.replace(/\D/g, "").slice(0, 2);
    const score = formatTennisSetsFromBoxes(next);
    onUpdate({ sets: next, score, matchStatus: "none", statusWinner: undefined, statusDetail: undefined });
  }

  function updateStatus(status: TennisMatchStatus) {
    if (status === "none") {
      onUpdate({ matchStatus: "none", statusDetail: undefined, statusWinner: undefined });
      return;
    }
    const autoSide =
      status === "did_not_start" || status === "default"
        ? noStartWinnerSide(match, seeds, noStartDefault)
        : status === "complete"
          ? tennisScoreWinnerSide(scoreText, scoringFormat)
          : null;
    onUpdate({
      matchStatus: status,
      statusDetail: status === "retirement" ? scores?.statusDetail ?? "Injury" : undefined,
      statusWinner: autoSide ?? scores?.statusWinner,
    });
  }

  if (!match.p1 || !match.p2 || match.p1.startsWith("BYE") || match.p2.startsWith("BYE")) {
    return (
      <div className="rounded-lg border border-border-2 p-2 text-sm text-grey-light">
        {t("TBD")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-2 p-2">
      <div className="grid items-center gap-x-1 gap-y-1" style={{ gridTemplateColumns: setGridCols }}>
        <div aria-hidden className="h-4" />
        {Array.from({ length: visibleSets }, (_, i) => (
          <span
            key={`hdr-${i}`}
            className="text-center text-[9px] font-semibold uppercase text-grey"
          >
            {t("Set")} {i + 1}
          </span>
        ))}

        <span
          className={cn(
            "truncate text-xs font-medium",
            isWinner(match.p1, winner) ? "text-[var(--mvp-blue)]" : "text-ink",
          )}
        >
          {match.p1}
        </span>
        {sets.p1.slice(0, visibleSets).map((val, i) => (
          <Input
            key={`p1-${i}`}
            className="h-8 w-10 px-1 text-center text-xs"
            inputMode="numeric"
            placeholder="—"
            value={val}
            onChange={(e) => updateSet("p1", i, e.target.value)}
            aria-label={`${match.p1} ${t("Set")} ${i + 1}`}
          />
        ))}

        <span
          className={cn(
            "truncate text-xs",
            isWinner(match.p2, winner) ? "font-medium text-[var(--mvp-blue)]" : "text-gray-2",
          )}
        >
          {match.p2}
        </span>
        {sets.p2.slice(0, visibleSets).map((val, i) => (
          <Input
            key={`p2-${i}`}
            className="h-8 w-10 px-1 text-center text-xs"
            inputMode="numeric"
            placeholder="—"
            value={val}
            onChange={(e) => updateSet("p2", i, e.target.value)}
            aria-label={`${match.p2} ${t("Set")} ${i + 1}`}
          />
        ))}
      </div>

      <div className="mt-2 space-y-2 border-t border-border-2 pt-2">
        <label className="block text-[10px] font-semibold uppercase text-grey">
          {t("Match status")}
        </label>
        <select
          value={matchStatus}
          onChange={(e) => updateStatus(e.target.value as TennisMatchStatus)}
          className="h-8 w-full rounded-lg border border-border-1 bg-white px-2 text-xs"
        >
          {TENNIS_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(tennisMatchStatusLabel(opt))}
            </option>
          ))}
        </select>

        {matchStatus === "retirement" ? (
          <select
            value={scores?.statusDetail ?? "Injury"}
            onChange={(e) => onUpdate({ statusDetail: e.target.value })}
            className="h-8 w-full rounded-lg border border-border-1 bg-white px-2 text-xs"
          >
            {RETIREMENT_DETAILS.map((d) => (
              <option key={d} value={d}>
                {t(d)}
              </option>
            ))}
          </select>
        ) : null}

        {needsWinnerPick ? (
          <select
            value={scores?.statusWinner ?? ""}
            onChange={(e) =>
              onUpdate({
                statusWinner:
                  e.target.value === "p1" || e.target.value === "p2"
                    ? (e.target.value as "p1" | "p2")
                    : undefined,
              })
            }
            className="h-8 w-full rounded-lg border border-border-1 bg-white px-2 text-xs"
          >
            <option value="">{t("Select winner")}</option>
            <option value="p1">{match.p1}</option>
            <option value="p2">{match.p2}</option>
          </select>
        ) : matchStatus !== "none" && inferredWinnerSide ? (
          <p className="text-[11px] font-medium text-[var(--mvp-blue)]">
            {inferredWinnerSide === "p1" ? match.p1 : match.p2} {t("advances")}
            {scoreWinnerSide && scoreText ? ` · ${scoreText}` : ""}
          </p>
        ) : null}
      </div>

      <MatchNoStartControls
        match={match}
        scores={scores}
        seeds={seeds}
        noStartDefault={noStartDefault}
        onUpdate={onUpdate}
        t={t}
      />

      {isWinner(match.p1, winner) || isWinner(match.p2, winner) ? (
        <p className="mt-2 text-[11px] font-medium text-[var(--mvp-blue)]">
          {winner} {t("advances")}
          {scoreText ? ` · ${scoreText}` : ""}
        </p>
      ) : resolved.complete ? null : scoreText && !parsed?.complete && matchStatus === "none" ? (
        <p className="mt-2 text-[11px] text-grey">
          {t("Fill in set scores until one player wins two sets.")}
        </p>
      ) : needsWinnerPick && !scores?.statusWinner ? (
        <p className="mt-2 text-[11px] text-grey">{t("Select winner to apply match status.")}</p>
      ) : null}
    </div>
  );
}

export function GolfLeaderboardEditor({
  players,
  scores,
  onSave,
  onMarkDidNotStart,
  t,
}: {
  players: { id: string; name: string; partnerName: string | null; handicap: number | null }[];
  scores: TournamentScoresData;
  onSave: (playerId: string, gross: number, net?: number) => void;
  onMarkDidNotStart: (playerId: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-2 text-left text-xs text-grey">
            <th className="pb-2 font-medium">{t("Player / Team")}</th>
            <th className="pb-2 font-medium">{t("Handicap")}</th>
            <th className="pb-2 font-medium">{t("Gross")}</th>
            <th className="pb-2 font-medium">{t("Net")}</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const entry = scores.leaderboard[p.id];
            const displayName = p.partnerName ? `${p.name} / ${p.partnerName}` : p.name;
            return (
              <GolfScoreRow
                key={p.id}
                playerId={p.id}
                displayName={displayName}
                handicap={p.handicap}
                gross={entry?.gross}
                net={entry?.net}
                didNotStart={entry?.status === "did_not_start"}
                onSave={onSave}
                onMarkDidNotStart={onMarkDidNotStart}
                t={t}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GolfScoreRow({
  playerId,
  displayName,
  handicap,
  gross: initialGross,
  net: initialNet,
  didNotStart,
  onSave,
  onMarkDidNotStart,
  t,
}: {
  playerId: string;
  displayName: string;
  handicap: number | null;
  gross?: number;
  net?: number;
  didNotStart: boolean;
  onSave: (playerId: string, gross: number, net?: number) => void;
  onMarkDidNotStart: (playerId: string) => void;
  t: (key: string) => string;
}) {
  const [gross, setGross] = useState(initialGross != null ? String(initialGross) : "");
  const [net, setNet] = useState(initialNet != null ? String(initialNet) : "");

  function save() {
    const g = Number(gross);
    if (!gross.trim() || Number.isNaN(g)) return;
    const n = net.trim() ? Number(net) : undefined;
    if (net.trim() && Number.isNaN(n)) return;
    onSave(playerId, g, n);
  }

  if (didNotStart) {
    return (
      <tr className="border-b border-border-2 last:border-0 bg-amber-50/50">
        <td className="py-2 font-medium text-ink">{displayName}</td>
        <td className="py-2 text-grey">{handicap ?? "—"}</td>
        <td className="py-2 text-amber-800" colSpan={2}>
          {t("Did not start")}
        </td>
        <td className="py-2 text-right">
          <button
            type="button"
            onClick={() => onMarkDidNotStart(playerId)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/10"
          >
            {t("Clear")}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border-2 last:border-0">
      <td className="py-2 font-medium text-ink">{displayName}</td>
      <td className="py-2 text-grey">{handicap ?? "—"}</td>
      <td className="py-2">
        <Input
          type="number"
          min={1}
          className="h-8 w-20 text-xs"
          placeholder="72"
          value={gross}
          onChange={(e) => setGross(e.target.value)}
        />
      </td>
      <td className="py-2">
        <Input
          type="number"
          min={1}
          className="h-8 w-20 text-xs"
          placeholder="—"
          value={net}
          onChange={(e) => setNet(e.target.value)}
        />
      </td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onMarkDidNotStart(playerId)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
          >
            {t("Did not start")}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/10"
          >
            {t("Save score")}
          </button>
        </div>
      </td>
    </tr>
  );
}
