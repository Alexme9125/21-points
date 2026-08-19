import { describe, expect, it } from "vitest";
import { holeHint, holeKind, isAceKing } from "./rules.js";
import type { Card, Rank, Suit } from "./types.js";

const c = (rank: Rank, suit: Suit = "spades"): Card => ({ rank, suit });

describe("holeKind", () => {
  it("treats adjacent ranks as consecutive, including A-2 and Q-K", () => {
    expect(holeKind(c(1), c(2))).toBe("consecutive");
    expect(holeKind(c(7), c(8))).toBe("consecutive");
    expect(holeKind(c(12), c(13))).toBe("consecutive");
  });

  it("does not treat A-K as consecutive", () => {
    expect(holeKind(c(1), c(13))).toBe("spread");
    expect(isAceKing(c(1), c(13))).toBe(true);
  });

  it("detects pairs", () => {
    expect(holeKind(c(9, "hearts"), c(9, "clubs"))).toBe("pair");
  });
});

describe("holeHint", () => {
  it("wins 5-10 on 4 and J", () => {
    const hint = holeHint(c(4), c(11));
    expect(hint.kind).toBe("spread");
    expect(hint.winRanks).toEqual([5, 6, 7, 8, 9, 10]);
    expect(hint.hornRanks).toEqual([4, 11]);
  });

  it("wins every non-horn rank on A-K", () => {
    const hint = holeHint(c(1), c(13));
    expect(hint.winRanks).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(hint.hornRanks).toEqual([1, 13]);
  });
});
