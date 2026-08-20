import { describe, expect, it } from "vitest";
import {
  canDouble,
  canSplit,
  canSurrender,
  dealerShouldHit,
  handValue,
  isBlackjack,
  isBust,
  payoutFor,
} from "./rules.js";
import type { Card, HandState, Rank, Suit } from "./types.js";

const c = (rank: Rank, suit: Suit = "spades"): Card => ({ rank, suit });

function hand(cards: Card[], extra: Partial<HandState> = {}): HandState {
  return { cards, bet: 10_000, status: "open", fromSplit: false, ...extra };
}

describe("handValue", () => {
  it("counts 2-10 at face value and faces as 10", () => {
    expect(handValue([c(7), c(10)]).total).toBe(17);
    expect(handValue([c(11), c(12)]).total).toBe(20);
    expect(handValue([c(13), c(5)]).total).toBe(15);
  });

  it("treats Ace as 11 or 1 so the total stays <= 21", () => {
    expect(handValue([c(1), c(8)])).toEqual({ total: 19, soft: true });
    expect(handValue([c(1), c(7), c(11)])).toEqual({ total: 18, soft: false });
    expect(handValue([c(1), c(1), c(9)])).toEqual({ total: 21, soft: true });
  });

  it("detects blackjack, bust, and dealer hit-to-17", () => {
    expect(isBlackjack([c(1), c(10)])).toBe(true);
    expect(isBlackjack([c(1), c(10)], true)).toBe(false);
    expect(isBlackjack([c(1), c(5), c(5)])).toBe(false);
    expect(isBust([c(13), c(12), c(5)])).toBe(true);
    expect(dealerShouldHit([c(10), c(6)])).toBe(true);
    expect(dealerShouldHit([c(1), c(6)])).toBe(false);
    expect(dealerShouldHit([c(10), c(7)])).toBe(false);
  });
});

describe("payoutFor", () => {
  const dealer20 = [c(10), c(10)];
  const dealerBj = [c(1), c(13)];
  const dealerBust = [c(10), c(6), c(8)];

  it("pays blackjack 1赔2 and regular wins 1赔1", () => {
    expect(payoutFor(hand([c(1), c(11)]), dealer20)).toEqual({ kind: "blackjack", payout: 30_000 });
    expect(payoutFor(hand([c(10), c(10)]), [c(9), c(8)])).toEqual({ kind: "win", payout: 20_000 });
    expect(payoutFor(hand([c(10), c(10)]), dealer20)).toEqual({ kind: "push", payout: 10_000 });
    expect(payoutFor(hand([c(10), c(8)]), dealer20)).toEqual({ kind: "lose", payout: 0 });
  });

  it("lets a split 21 win even money, not blackjack odds", () => {
    const split21 = hand([c(1), c(10)], { fromSplit: true, status: "stood" });
    expect(payoutFor(split21, dealer20)).toEqual({ kind: "win", payout: 20_000 });
  });

  it("gives busts to the dealer even if the dealer also busts", () => {
    expect(payoutFor(hand([c(10), c(8), c(6)], { status: "bust" }), dealerBust)).toEqual({
      kind: "bust",
      payout: 0,
    });
    expect(payoutFor(hand([c(10), c(9)], { status: "stood" }), dealerBust)).toEqual({
      kind: "win",
      payout: 20_000,
    });
  });

  it("pushes two blackjacks and returns half on surrender", () => {
    expect(payoutFor(hand([c(1), c(10)], { status: "blackjack" }), dealerBj)).toEqual({
      kind: "push",
      payout: 10_000,
    });
    expect(payoutFor(hand([c(10), c(6)], { status: "surrender" }), dealer20)).toEqual({
      kind: "surrender",
      payout: 5_000,
    });
  });
});

describe("action gates", () => {
  it("allows split on a rank pair, double on two cards, surrender unless dealer shows Ace", () => {
    const pair = hand([c(8, "hearts"), c(8, "clubs")]);
    expect(canSplit(pair, 10_000)).toBe(true);
    expect(canSplit(hand([c(10), c(12)]), 10_000)).toBe(false);
    expect(canDouble(hand([c(5), c(6)]), 10_000)).toBe(true);
    expect(canDouble(hand([c(1), c(10)]), 10_000)).toBe(false);
    expect(canSurrender(hand([c(10), c(6)]), c(10))).toBe(true);
    expect(canSurrender(hand([c(10), c(6)]), c(1))).toBe(false);
  });
});
