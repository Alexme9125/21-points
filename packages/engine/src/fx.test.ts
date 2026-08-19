import { describe, expect, it } from "vitest";
import { chipsForStage, FX_MS, openingRevealStage, revealHoldMs, shouldShowThird } from "./fx.js";
import type { RevealOutcome } from "./types.js";

describe("reveal staging", () => {
  it("opens add outcomes on the wager beat and skips it for folds", () => {
    expect(openingRevealStage("win")).toBe("wager");
    expect(openingRevealStage("fold")).toBe("result");
    expect(openingRevealStage("consecutive")).toBe("result");
  });

  it("holds the table long enough for wager + flip + result + payout on a win", () => {
    const win = revealHoldMs("win");
    const lose = revealHoldMs("lose");
    expect(win).toBeGreaterThan(lose);
    expect(win).toBeGreaterThanOrEqual(FX_MS.wager + FX_MS.flip + FX_MS.result + FX_MS.payout);
    expect(lose).toBeGreaterThanOrEqual(FX_MS.wager + FX_MS.flip + FX_MS.result);
  });

  it("shows the stake sitting in the pot on a win until chips are taken back", () => {
    const outcome: RevealOutcome = { kind: "win", amount: 10_000, wager: 10_000 };
    const posted = chipsForStage(70_000, 510_000, outcome, "wager");
    expect(posted.pool).toBe(90_000);
    expect(posted.actorTokens).toBe(490_000);
    expect(chipsForStage(70_000, 510_000, outcome, "done")).toEqual({
      pool: 70_000,
      actorTokens: 510_000,
    });
  });

  it("keeps a plain lose at the posted numbers (bet stays in the pot)", () => {
    const outcome: RevealOutcome = { kind: "lose", amount: 10_000, wager: 10_000 };
    expect(chipsForStage(90_000, 490_000, outcome, "wager")).toEqual({
      pool: 90_000,
      actorTokens: 490_000,
    });
  });

  it("only posts the original add on a horn until the extra is collected", () => {
    const outcome: RevealOutcome = { kind: "horn", amount: 20_000, wager: 10_000, multiplier: 2 };
    const posted = chipsForStage(100_000, 480_000, outcome, "result");
    expect(posted.pool).toBe(90_000);
    expect(posted.actorTokens).toBe(490_000);
  });

  it("hides the third card until the flip beat", () => {
    expect(shouldShowThird("wager", true)).toBe(false);
    expect(shouldShowThird("flip", true)).toBe(true);
    expect(shouldShowThird("result", true)).toBe(true);
    expect(shouldShowThird("wager", false)).toBe(false);
  });
});
