import { holeKind } from "./rules.js";
import { computeBetRange, currentPlayer } from "./table.js";
import type { Card, PlayerAction, Rank, TableState } from "./types.js";

function countRank(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

export function chooseBotAction(state: TableState): PlayerAction {
  const player = currentPlayer(state);
  if (!player || state.phase !== "awaiting" || !state.hole) {
    return { type: "fold" };
  }
  const range = computeBetRange(state);
  if (!range) return { type: "fold" };

  const hole = state.hole;
  const kind = holeKind(hole[0], hole[1]);
  const remain = state.deck;
  const total = remain.length || 1;

  if (kind === "pair") {
    const hits = countRank(remain, hole[0].rank);
    const pHit = hits / total;
    const ev = pHit * state.projectPool - (1 - pHit) * range.min;
    return ev > 0 ? { type: "add", amount: range.min } : { type: "fold" };
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
  const unitEv = pWin - pLose - pHorn * mult;
  if (unitEv <= 0.02) return { type: "fold" };

  const aggressive = unitEv > 0.18;
  const fraction = aggressive ? 0.55 : 0.28;
  const raw = Math.round((range.min + (range.max - range.min) * fraction) / 1000) * 1000;
  const amount = Math.min(range.max, Math.max(range.min, raw || range.min));
  return { type: "add", amount };
}

export function botThinkMs(rngValue: number): number {
  return Math.round(2400 + rngValue * 1600);
}
