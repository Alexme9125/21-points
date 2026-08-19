import type { OutcomeKind, RevealOutcome } from "./types.js";

export const FX_MS = {
  wager: 1000,
  flip: 800,
  result: 1100,
  payout: 1000,
} as const;

export type RevealFxStage = "idle" | "wager" | "flip" | "result" | "payout" | "done";

export function openingRevealStage(kind: OutcomeKind | undefined): RevealFxStage {
  if (!kind) return "idle";
  if (kind === "fold" || kind === "consecutive") return "result";
  return "wager";
}

export function revealHoldMs(kind: OutcomeKind): number {
  if (kind === "fold") return FX_MS.result + 800;
  if (kind === "consecutive") return FX_MS.result + 1300;
  const settle = FX_MS.wager + FX_MS.flip + FX_MS.result;
  if (kind === "win" || kind === "triple_win" || kind === "horn") {
    return settle + FX_MS.payout + 500;
  }
  return settle + 500;
}

/** Chip counts to show before the result is applied (bet sitting in the pot). */
export function chipsForStage(
  pool: number,
  actorTokens: number,
  outcome: RevealOutcome,
  stage: RevealFxStage,
): { pool: number; actorTokens: number } {
  if (stage === "idle" || stage === "done") {
    return { pool, actorTokens };
  }
  const wager = outcome.wager ?? 0;
  if (wager <= 0) return { pool, actorTokens };

  const amount = outcome.amount;
  if (outcome.kind === "win" || outcome.kind === "triple_win") {
    return {
      pool: pool + amount + wager,
      actorTokens: Math.max(0, actorTokens - amount - wager),
    };
  }
  return {
    pool: Math.max(0, pool - amount + wager),
    actorTokens: actorTokens + amount - wager,
  };
}

export function shouldShowThird(stage: RevealFxStage, hasThird: boolean): boolean {
  if (!hasThird) return false;
  return stage === "flip" || stage === "result" || stage === "payout" || stage === "done" || stage === "idle";
}

export const RESULT_LOG_KINDS: ReadonlySet<string> = new Set([
  "win",
  "lose",
  "horn",
  "triple_win",
  "triple_lose",
]);
