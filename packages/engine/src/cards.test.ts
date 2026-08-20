import { describe, expect, it } from "vitest";
import { cardKey, CARDS_PER_DECK, makeDeck, shoeCut } from "./cards.js";
import { decksForSeats, DEFAULT_CONFIG } from "./types.js";

describe("decksForSeats", () => {
  it("maps seated players to a shoe large enough for a round with splits", () => {
    expect(decksForSeats(1)).toBe(1);
    expect(decksForSeats(2)).toBe(2);
    expect(decksForSeats(3)).toBe(2);
    expect(decksForSeats(4)).toBe(4);
    expect(decksForSeats(5)).toBe(4);
    expect(decksForSeats(6)).toBe(6);
    expect(DEFAULT_CONFIG.deckCount).toBe(decksForSeats(DEFAULT_CONFIG.seatCount));
  });
});

describe("makeDeck", () => {
  it("stacks the requested number of 52-card decks with unique keys", () => {
    expect(makeDeck()).toHaveLength(CARDS_PER_DECK);
    const six = makeDeck(6);
    expect(six).toHaveLength(6 * CARDS_PER_DECK);
    expect(new Set(six.map(cardKey)).size).toBe(6 * CARDS_PER_DECK);
    expect(six.filter((card) => card.rank === 1 && card.suit === "spades")).toHaveLength(6);
  });
});

describe("shoeCut", () => {
  it("keeps at least 20 cards and about a quarter of a larger shoe", () => {
    expect(shoeCut(1)).toBe(20);
    expect(shoeCut(2)).toBe(26);
    expect(shoeCut(4)).toBe(52);
    expect(shoeCut(6)).toBe(78);
  });
});
