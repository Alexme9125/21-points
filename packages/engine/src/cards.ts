import type { Card, Rank, Suit } from "./types.js";
import { RANK_LABELS } from "./types.js";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ rank: rank as Rank, suit });
    }
  }
  return deck;
}

export function cardKey(card: Card): string {
  return `${card.suit}:${card.rank}`;
}

export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank];
}

export function cardLabel(card: Card): string {
  const suitMark =
    card.suit === "spades"
      ? "♠"
      : card.suit === "hearts"
        ? "♥"
        : card.suit === "diamonds"
          ? "♦"
          : "♣";
  return `${rankLabel(card.rank)}${suitMark}`;
}

export function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}
