import { describe, expect, it } from "vitest";
import {
  betChipAmounts,
  clampBet,
  doubleLastBetAmount,
  formatBetDraft,
  isLegalBetAmount,
  parseBetInput,
  repeatBetAmount,
} from "./bets.js";
import { DEFAULT_CONFIG } from "./types.js";

describe("betChipAmounts", () => {
  it("builds a 1–2–5–10 ladder for the default blackjack table", () => {
    expect(betChipAmounts(DEFAULT_CONFIG.minBet, DEFAULT_CONFIG.maxBet)).toEqual([
      1_000, 2_000, 5_000, 10_000,
    ]);
  });

  it("includes the current max when the stack is short of a chip", () => {
    expect(betChipAmounts(1_000, 3_500)).toEqual([1_000, 2_000, 3_500]);
  });
});

describe("clampBet and legality", () => {
  it("snaps to the table step and accepts min/max even when max is off-step", () => {
    expect(clampBet(1_400, 1_000, 10_000)).toBe(1_000);
    expect(clampBet(1_600, 1_000, 10_000)).toBe(2_000);
    const range = { min: 1_000, max: 3_500, locked: false };
    expect(isLegalBetAmount(1_000, range)).toBe(true);
    expect(isLegalBetAmount(2_000, range)).toBe(true);
    expect(isLegalBetAmount(3_500, range)).toBe(true);
    expect(isLegalBetAmount(1_500, range)).toBe(false);
  });
});

describe("parseBetInput", () => {
  it("reads plain numbers and K/M suffixes", () => {
    expect(parseBetInput("3000")).toBe(3_000);
    expect(parseBetInput("3K")).toBe(3_000);
    expect(parseBetInput(" 3.5k ")).toBe(3_500);
    expect(parseBetInput("1M")).toBe(1_000_000);
    expect(parseBetInput("abc")).toBeNull();
    expect(formatBetDraft(3_000)).toBe("3K");
    expect(formatBetDraft(3_500)).toBe("3500");
  });
});

describe("repeat bets", () => {
  it("repeats the last wager and offers 2× until the table max", () => {
    const range = { min: 1_000, max: 10_000, locked: false };
    expect(repeatBetAmount(5_000, range)).toBe(5_000);
    expect(doubleLastBetAmount(5_000, range)).toBe(10_000);
    expect(doubleLastBetAmount(10_000, range)).toBeNull();
    expect(repeatBetAmount(null, range)).toBeNull();
  });
});
