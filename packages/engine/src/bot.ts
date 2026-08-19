import { styleForPersona, type PlayStyle } from "./personas.js";
import { holeKind } from "./rules.js";
import { computeBetRange, currentPlayer } from "./table.js";
import type { BetRange, Card, PlayerAction, Rank, TableState } from "./types.js";

function countRank(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

export interface SpotEval {
  unitEv: number;
  pWin: number;
  kind: ReturnType<typeof holeKind>;
}

export function evaluateSpot(state: TableState): SpotEval | null {
  if (!state.hole) return null;
  const hole = state.hole;
  const kind = holeKind(hole[0], hole[1]);
  const remain = state.deck;
  const total = remain.length || 1;
  const range = computeBetRange(state);

  if (kind === "pair") {
    const hits = countRank(remain, hole[0].rank);
    const pHit = hits / total;
    const stake = range?.min ?? 1;
    const ev = pHit * state.projectPool - (1 - pHit) * stake;
    return { kind, pWin: pHit, unitEv: ev / Math.max(stake, 1) };
  }

  const low = Math.min(hole[0].rank, hole[1].rank);
  const high = Math.max(hole[0].rank, hole[1].rank);
  let win = 0;
  let horn = 0;
  let lose = 0;
  for (const card of remain) {
    if (card.rank === hole[0].rank || card.rank === hole[1].rank) horn += 1;
    else if (card.rank > low && card.rank < high) win += 1;
    else lose += 1;
  }
  const pWin = win / total;
  const pHorn = horn / total;
  const pLose = lose / total;
  const mult = low === 1 && high === 13 ? 4 : 2;
  return { kind, pWin, unitEv: pWin - pLose - pHorn * mult };
}

function shouldFold(style: PlayStyle, spot: SpotEval): boolean {
  const wobble = (Math.random() * 2 - 1) * style.mood;
  const line = style.foldBelow + wobble;
  if (spot.unitEv <= line) return true;
  const over = spot.unitEv - line;
  if (over < 0.16 && Math.random() < style.scratch * (1 - over / 0.16)) return true;
  return false;
}

function heatFromEv(unitEv: number): number {
  return Math.max(0, Math.min(1, (unitEv + 0.42) / 0.72));
}

function pickAmount(range: BetRange, style: PlayStyle, spot: SpotEval): number {
  const heat = heatFromEv(spot.unitEv);
  const low = 0.05 + style.sizeBias * 0.08;
  const high = 0.32 + style.sizeBias * 0.62;
  let fraction = low + (high - low) * heat ** 0.9;

  const shoveHeat =
    Math.max(0, (spot.unitEv - 0.2) / 0.22) * Math.max(0, (spot.pWin - 0.6) / 0.28);
  const shoveP = Math.min(0.75, style.shove * shoveHeat);
  if (Math.random() < shoveP) {
    fraction = 1;
  } else {
    fraction *= 1 + (Math.random() * 2 - 1) * 0.12;
  }

  fraction = Math.max(0.04, Math.min(1, fraction));
  const raw = Math.round((range.min + (range.max - range.min) * fraction) / 1000) * 1000;
  return Math.min(range.max, Math.max(range.min, raw || range.min));
}

export function chooseBotAction(state: TableState): PlayerAction {
  const player = currentPlayer(state);
  if (!player || state.phase !== "awaiting" || !state.hole) {
    return { type: "fold" };
  }
  const range = computeBetRange(state);
  if (!range) return { type: "fold" };

  const style = styleForPersona(player.personaId);
  const spot = evaluateSpot(state);
  if (!spot) return { type: "fold" };

  if (shouldFold(style, spot)) return { type: "fold" };

  if (range.locked) {
    return { type: "add", amount: range.min };
  }

  return { type: "add", amount: pickAmount(range, style, spot) };
}

/** Human-like tank: rarely snap, linger near the fold line, occasional extra pause. */
export function botThinkMs(state: TableState): number {
  const player = currentPlayer(state);
  const style = styleForPersona(player?.personaId);
  const spot = evaluateSpot(state);
  const dist = spot ? Math.abs(spot.unitEv - style.foldBelow) : 0.2;
  const hesitation = Math.max(0, 1 - dist / 0.12);
  const triangular = (Math.random() + Math.random()) / 2;
  const span = style.thinkMax - style.thinkMin;
  const extraTank = Math.random() < 0.1 ? 800 + Math.random() * 1800 : 0;
  const snap = dist > 0.24 && Math.random() < 0.18 ? -Math.min(1400, span * 0.22) : 0;
  const pairBeat = spot?.kind === "pair" ? 400 : 0;
  const ms =
    style.thinkMin +
    span * (0.22 + 0.58 * triangular) +
    hesitation * 2000 +
    extraTank +
    snap +
    pairBeat +
    Math.random() * 500;
  return Math.round(Math.min(12_000, Math.max(3_600, ms)));
}
