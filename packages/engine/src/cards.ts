import type { Card, Rank, Suit } from "./types.js";
import { RANK_LABELS } from "./types.js";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const CARDS_PER_DECK = 52;

export function makeDeck(decks = 1): Card[] {
  const count = Math.max(1, Math.round(decks));
  const deck: Card[] = [];
  for (let shoe = 0; shoe < count; shoe++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ rank: rank as Rank, suit, shoe });
      }
    }
  }
  return deck;
}

/** Reshuffle when remaining cards fall below about a quarter of the shoe (at least 20). */
export function shoeCut(deckCount: number): number {
  const n = Math.max(1, Math.round(deckCount));
  return Math.max(20, Math.floor(n * CARDS_PER_DECK * 0.25));
}

export function cardKey(card: Card): string {
  return `${card.shoe ?? 0}:${card.suit}:${card.rank}`;
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
