import { rankLabel } from "./cards.js";
import type { Card, HoleHint, HoleKind, Rank } from "./types.js";

export function holeKind(a: Card, b: Card): HoleKind {
  if (a.rank === b.rank) return "pair";
  if (Math.abs(a.rank - b.rank) === 1) return "consecutive";
  return "spread";
}

export function orderedRanks(a: Card, b: Card): { low: Rank; high: Rank } {
  return a.rank <= b.rank
    ? { low: a.rank, high: b.rank }
    : { low: b.rank, high: a.rank };
}

export function isAceKing(a: Card, b: Card): boolean {
  const { low, high } = orderedRanks(a, b);
  return low === 1 && high === 13;
}

export function holeHint(a: Card, b: Card): HoleHint {
  const kind = holeKind(a, b);
  const winRanks: Rank[] = [];
  const hornRanks: Rank[] = [];
  const loseRanks: Rank[] = [];

  if (kind === "consecutive") {
    for (let r = 1; r <= 13; r++) loseRanks.push(r as Rank);
    return { kind, winRanks, hornRanks, loseRanks };
  }

  if (kind === "pair") {
    hornRanks.push(a.rank);
    for (let r = 1; r <= 13; r++) {
      if (r !== a.rank) loseRanks.push(r as Rank);
    }
    return { kind, winRanks, hornRanks, loseRanks };
  }

  const { low, high } = orderedRanks(a, b);
  for (let r = 1; r <= 13; r++) {
    const rank = r as Rank;
    if (r > low && r < high) winRanks.push(rank);
    else if (r === low || r === high) hornRanks.push(rank);
    else loseRanks.push(rank);
  }
  return { kind, winRanks, hornRanks, loseRanks };
}

export function hintSummary(hint: HoleHint): string {
  if (hint.kind === "consecutive") return "连张，系统自动放弃";
  if (hint.kind === "pair") {
    return `三张：再开出 ${rankLabel(hint.hornRanks[0]!)} 可通吃许愿池`;
  }
  const wins = hint.winRanks.map(rankLabel).join("、") || "无";
  const horns = hint.hornRanks.map(rankLabel).join("、");
  return `开出 ${wins} 为赢；开出 ${horns} 为牛角尖`;
}
