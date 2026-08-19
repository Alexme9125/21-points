import { styleForPersona } from "./personas.js";
import { holeKind } from "./rules.js";
import { computeBetRange, currentPlayer } from "./table.js";
import type { Card, PlayerAction, Rank, TableState } from "./types.js";

function countRank(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

export interface SpotEval {
  unitEv: number;
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
    return { kind, unitEv: ev / Math.max(stake, 1) };
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
  return { kind, unitEv: pWin - pLose - pHorn * mult };
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

  const wobble = (Math.random() * 2 - 1) * style.mood;
  const line = style.foldBelow + wobble;
  if (spot.unitEv <= line) return { type: "fold" };

  if (range.locked) {
    return { type: "add", amount: range.min };
  }

  const edge = Math.max(0, Math.min(1, (spot.unitEv - line) / 0.35));
  const jitter = 1 + (Math.random() * 2 - 1) * 0.14;
  const fraction = Math.max(0.12, Math.min(0.82, style.sizeBias * (0.55 + 0.7 * edge) * jitter));
  const raw = Math.round((range.min + (range.max - range.min) * fraction) / 1000) * 1000;
  const amount = Math.min(range.max, Math.max(range.min, raw || range.min));
  return { type: "add", amount };
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
  const extraTank = Math.random() < 0.14 ? 1600 + Math.random() * 2400 : 0;
  const snap = dist > 0.24 && Math.random() < 0.16 ? -Math.min(1600, span * 0.22) : 0;
  const pairBeat = spot?.kind === "pair" ? 900 : 0;
  const ms =
    style.thinkMin +
    span * (0.28 + 0.62 * triangular) +
    hesitation * 3400 +
    extraTank +
    snap +
    pairBeat +
    Math.random() * 800;
  return Math.round(Math.min(16_000, Math.max(5_200, ms)));
}
