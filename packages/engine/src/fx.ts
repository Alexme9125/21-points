import type { OutcomeKind, PublicPlayer, RevealOutcome, SeatCards } from "./types.js";

export const FX_MS = {
  wager: 1000,
  flip: 800,
  result: 1100,
  payout: 1000,
} as const;

export type RevealFxStage = "idle" | "wager" | "flip" | "result" | "payout" | "done";

export function openingRevealStage(kind: OutcomeKind | undefined): RevealFxStage {
  if (!kind) return "idle";
  return "wager";
}

export function revealHoldMs(_kind?: OutcomeKind): number {
  return FX_MS.flip + FX_MS.result + FX_MS.payout + 700;
}

export function shouldShowDealerHole(stage: RevealFxStage, hidden: boolean, phaseReveal: boolean): boolean {
  if (!phaseReveal && !hidden) return true;
  if (!phaseReveal) return false;
  return stage === "flip" || stage === "result" || stage === "payout" || stage === "done";
}

function outcomesOf(cards: SeatCards | undefined): RevealOutcome[] {
  return (cards?.hands ?? []).map((h) => h.outcome).filter((o): o is RevealOutcome => Boolean(o));
}

/** Undo payouts until the payout beat so bets still sit in the middle. */
export function chipsForStage(
  pot: number,
  players: PublicPlayer[],
  stage: RevealFxStage,
): { pot: number; tokens: Record<string, number> } {
  const tokens: Record<string, number> = {};
  for (const p of players) tokens[p.id] = p.tokens;
  if (stage === "payout" || stage === "done" || stage === "idle") {
    return { pot, tokens };
  }
  let sitting = 0;
  for (const p of players) {
    const outs = outcomesOf(p.cards);
    let payout = 0;
    let wager = 0;
    for (const o of outs) {
      payout += o.amount;
      wager += o.wager;
    }
    tokens[p.id] = p.tokens - payout;
    sitting += wager;
  }
  return { pot: sitting || pot, tokens };
}

export const RESULT_LOG_KINDS: ReadonlySet<string> = new Set([
  "win",
  "lose",
  "bust",
  "blackjack",
  "push",
  "surrender",
  "dealer",
]);
