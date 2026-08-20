import { describe, expect, it } from "vitest";
import { chipsForStage, FX_MS, openingRevealStage, revealHoldMs, shouldShowDealerHole } from "./fx.js";
import type { PublicPlayer, RevealOutcome } from "./types.js";

function player(outcome: RevealOutcome, tokens = 510_000): PublicPlayer {
  return {
    id: "p1",
    name: "You",
    kind: "human",
    tokens,
    inHand: true,
    cards: {
      hands: [{ cards: [], bet: outcome.wager, status: "stood", fromSplit: false, outcome }],
    },
  };
}

describe("reveal staging", () => {
  it("opens round results on the dealer flip", () => {
    expect(openingRevealStage("win")).toBe("wager");
    expect(openingRevealStage("blackjack")).toBe("wager");
    expect(openingRevealStage(undefined)).toBe("idle");
  });

  it("holds long enough for flip + result + payout", () => {
    expect(revealHoldMs("win")).toBeGreaterThanOrEqual(FX_MS.flip + FX_MS.result + FX_MS.payout);
  });

  it("keeps the stake in the pot until payout on a win", () => {
    const outcome: RevealOutcome = { kind: "win", amount: 20_000, wager: 10_000 };
    const staged = chipsForStage(0, [player(outcome, 510_000)], "result");
    expect(staged.tokens.p1).toBe(490_000);
    expect(staged.pot).toBe(10_000);
    expect(chipsForStage(0, [player(outcome, 510_000)], "done")).toEqual({
      pot: 0,
      tokens: { p1: 510_000 },
    });
  });

  it("only reveals the hole card from the flip beat onward", () => {
    expect(shouldShowDealerHole("wager", true, true)).toBe(false);
    expect(shouldShowDealerHole("flip", true, true)).toBe(true);
    expect(shouldShowDealerHole("idle", true, false)).toBe(false);
  });
});
