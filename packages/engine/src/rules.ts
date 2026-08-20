import { rankLabel } from "./cards.js";
import type { ActionType, Card, HandHint, HandState, OutcomeKind, Rank, TableState } from "./types.js";

/** Face value used in 21: A is 1 here; soft/hard handling lives in `handValue`. */
export function pipValue(rank: Rank): number {
  if (rank >= 10) return 10;
  return rank;
}

export function dealerUpValue(card: Card | undefined): number | null {
  if (!card) return null;
  return pipValue(card.rank);
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === 1) {
      aces += 1;
      total += 11;
    } else {
      total += pipValue(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards: Card[], fromSplit = false): boolean {
  return !fromSplit && cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

/** 庄家 17 点及以上停牌（含软 17）。 */
export function dealerShouldHit(cards: Card[]): boolean {
  return handValue(cards).total < 17;
}

export function handLabel(cards: Card[], fromSplit = false): string {
  if (isBlackjack(cards, fromSplit)) return "黑杰克";
  const { total, soft } = handValue(cards);
  if (total > 21) return "爆牌";
  if (soft) return `软${total}`;
  return `${total}点`;
}

export function hintFor(cards: Card[], dealerUp: Card | undefined, fromSplit = false): HandHint {
  const { total, soft } = handValue(cards);
  return {
    total,
    soft,
    dealerUp: dealerUpValue(dealerUp),
    label: `${handLabel(cards, fromSplit)}${dealerUp ? ` · 庄家 ${rankLabel(dealerUp.rank)}` : ""}`,
  };
}

export function hintSummary(hint: HandHint): string {
  return hint.label;
}

function sameSplitRank(a: Card, b: Card): boolean {
  return a.rank === b.rank;
}

export function canSplit(hand: HandState, tokens: number): boolean {
  if (hand.fromSplit) return false;
  if (hand.cards.length !== 2) return false;
  if (hand.status !== "open") return false;
  if (!sameSplitRank(hand.cards[0]!, hand.cards[1]!)) return false;
  return tokens >= hand.bet;
}

export function canDouble(hand: HandState, tokens: number): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.status !== "open") return false;
  if (isBlackjack(hand.cards, hand.fromSplit)) return false;
  return tokens >= hand.bet;
}

export function canSurrender(hand: HandState, dealerUp: Card | undefined): boolean {
  if (hand.fromSplit) return false;
  if (hand.cards.length !== 2) return false;
  if (hand.status !== "open") return false;
  if (isBlackjack(hand.cards, hand.fromSplit)) return false;
  // 庄家反开 A 时不可投降
  if (dealerUp?.rank === 1) return false;
  return true;
}

export function canHit(hand: HandState): boolean {
  if (hand.status !== "open") return false;
  if (isBlackjack(hand.cards, hand.fromSplit)) return false;
  // 分牌后的 A 只补一张
  if (hand.fromSplit && hand.cards[0]?.rank === 1 && hand.cards.length >= 2) return false;
  return true;
}

export function legalPlayActions(
  hand: HandState,
  tokens: number,
  dealerUp: Card | undefined,
): ActionType[] {
  const actions: ActionType[] = [];
  if (hand.status !== "open") return actions;
  if (canHit(hand)) actions.push("hit");
  actions.push("stand");
  if (canDouble(hand, tokens)) actions.push("double");
  if (canSplit(hand, tokens)) actions.push("split");
  if (canSurrender(hand, dealerUp)) actions.push("surrender");
  return actions;
}

export function legalActions(state: TableState): ActionType[] {
  if (state.phase === "betting") return ["bet"];
  if (state.phase !== "awaiting") return [];
  const player = state.players[state.currentIndex];
  const seat = player ? state.lastCards[player.id] : undefined;
  const hand = seat?.hands[state.currentHandIndex];
  if (!player || !hand) return [];
  return legalPlayActions(hand, player.tokens, state.dealer[0]);
}

/**
 * Chips returned to the player after comparing with the dealer.
 * Blackjack pays 1赔2 (stake back + 2× profit). Regular wins pay 1赔1.
 * Split 21 is a normal 21, not blackjack.
 */
export function payoutFor(
  hand: HandState,
  dealerCards: Card[],
): { kind: OutcomeKind; payout: number } {
  const wager = hand.bet;
  if (hand.status === "surrender") {
    return { kind: "surrender", payout: Math.floor(wager / 2) };
  }
  const playerBj = isBlackjack(hand.cards, hand.fromSplit);
  const dealerBj = isBlackjack(dealerCards);
  if (playerBj && dealerBj) return { kind: "push", payout: wager };
  if (playerBj) return { kind: "blackjack", payout: wager * 3 };
  if (hand.status === "bust" || isBust(hand.cards)) {
    return { kind: "bust", payout: 0 };
  }
  if (dealerBj) return { kind: "lose", payout: 0 };

  const playerTotal = handValue(hand.cards).total;
  const dealerTotal = handValue(dealerCards).total;
  if (dealerTotal > 21) return { kind: "win", payout: wager * 2 };
  if (playerTotal > dealerTotal) return { kind: "win", payout: wager * 2 };
  if (playerTotal < dealerTotal) return { kind: "lose", payout: 0 };
  return { kind: "push", payout: wager };
}
