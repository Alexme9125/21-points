import { describe, expect, it } from "vitest";
import { makeDeck } from "./cards.js";
import {
  advance,
  applyAction,
  continueFromSettlement,
  createTable,
  DEFAULT_CONFIG,
  forceBetting,
  forcePlaying,
  MAX_SEATS,
  MIN_SEATS,
  clampSeatCount,
  decksForSeats,
  startHand,
  toPublicState,
} from "./index.js";
import type { Card, Player, Rank, Suit, TableState } from "./types.js";

const c = (rank: Rank, suit: Suit = "spades"): Card => ({ rank, suit });
const START = DEFAULT_CONFIG.startingTokens;
const BET = 2_000;

function fourPlayers(): Pick<Player, "id" | "name" | "kind">[] {
  return [
    { id: "p1", name: "You", kind: "human" },
    { id: "p2", name: "Tibo", kind: "bot" },
    { id: "p3", name: "Linus", kind: "bot" },
    { id: "p4", name: "Aqua", kind: "bot" },
  ];
}

function fresh(): TableState {
  const table = createTable(fourPlayers(), DEFAULT_CONFIG, 1);
  for (const p of table.players) {
    p.inHand = true;
    p.tokens = DEFAULT_CONFIG.startingTokens;
  }
  return table;
}

describe("betting and play", () => {
  it("starts a hand in the betting phase with a legal range", () => {
    const state = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 99));
    expect(state.phase).toBe("betting");
    const pub = toPublicState(state);
    expect(pub.betRange).toEqual({
      min: DEFAULT_CONFIG.minBet,
      max: DEFAULT_CONFIG.maxBet,
      locked: false,
    });
    expect(pub.legalActions).toEqual(["bet"]);
    expect(state.players.every((p) => p.tokens === DEFAULT_CONFIG.startingTokens)).toBe(true);
  });

  it("hides the dealer hole card from public state while players act", () => {
    let state = forcePlaying(fresh(), 0, [c(10), c(7)], [c(9), c(10)], [c(5)]);
    const pub = toPublicState(state);
    expect(pub.dealer.cards).toHaveLength(1);
    expect(pub.dealer.cards[0]?.rank).toBe(9);
    expect(pub.dealer.hidden).toBe(true);
    expect(pub.dealer.total).toBeNull();
  });

  it("hits until the player stands, then the dealer draws to 17 and regular 20 beats 18", () => {
    // Player 10+7=17, hits a 3 → 20, stands. Dealer 9+6=15, draws 3 → 18.
    let state = forcePlaying(
      fresh(),
      0,
      [c(10), c(7)],
      [c(9), c(6)],
      [c(3, "hearts"), c(3, "clubs")],
      BET,
    );
    state = applyAction(state, "p1", { type: "hit" });
    expect(state.lastCards.p1!.hands[0]!.cards).toHaveLength(3);
    expect(state.phase).toBe("awaiting");
    state = applyAction(state, "p1", { type: "stand" });
    expect(state.phase).toBe("reveal");
    expect(state.dealerRevealed).toBe(true);
    expect(state.dealer.map((card) => card.rank)).toEqual([9, 6, 3]);
    expect(state.lastCards.p1!.hands[0]!.outcome?.kind).toBe("win");
    expect(state.players[0]!.tokens).toBe(START + BET);
  });

  it("busting loses even if the dealer would have busted", () => {
    let state = forcePlaying(
      fresh(),
      0,
      [c(10), c(8)],
      [c(10), c(6)],
      [c(6, "hearts"), c(8, "clubs")],
      BET,
    );
    state = applyAction(state, "p1", { type: "hit" });
    expect(state.phase).toBe("reveal");
    expect(state.lastCards.p1!.hands[0]!.outcome?.kind).toBe("bust");
    expect(state.dealer).toHaveLength(2);
    expect(state.players[0]!.tokens).toBe(START - BET);
  });

  it("pays 1赔2 on a natural blackjack when the dealer does not have one", () => {
    const state = forcePlaying(fresh(), 0, [c(1), c(13)], [c(10), c(8)], [], BET);
    expect(state.phase).toBe("reveal");
    expect(state.lastCards.p1!.hands[0]!.outcome?.kind).toBe("blackjack");
    expect(state.lastCards.p1!.hands[0]!.outcome?.amount).toBe(BET * 3);
    expect(state.players[0]!.tokens).toBe(START + BET * 2);
  });

  it("doubles the stake and draws exactly one more card", () => {
    let state = forcePlaying(fresh(), 0, [c(5), c(6)], [c(9), c(10)], [c(10, "hearts")], BET);
    state = applyAction(state, "p1", { type: "double" });
    expect(state.lastCards.p1!.hands[0]!.cards).toHaveLength(3);
    expect(state.lastCards.p1!.hands[0]!.bet).toBe(BET * 2);
    expect(state.lastCards.p1!.hands[0]!.outcome?.kind).toBe("win");
    expect(state.players[0]!.tokens).toBe(START + BET * 2);
  });

  it("splits a pair into two hands with a matching extra bet", () => {
    let state = forcePlaying(
      fresh(),
      0,
      [c(8, "spades"), c(8, "hearts")],
      [c(6), c(10)],
      [c(3, "clubs"), c(10, "diamonds"), c(9, "clubs")],
      BET,
    );
    state = applyAction(state, "p1", { type: "split" });
    expect(state.lastCards.p1!.hands).toHaveLength(2);
    expect(state.lastCards.p1!.hands[0]!.cards).toHaveLength(2);
    expect(state.players[0]!.tokens).toBe(START - BET * 2);
    state = applyAction(state, "p1", { type: "stand" });
    expect(state.lastCards.p1!.hands[1]!.cards.length).toBeGreaterThanOrEqual(2);
    state = applyAction(state, "p1", { type: "stand" });
    expect(state.phase).toBe("reveal");
    expect(state.lastCards.p1!.hands.every((h) => h.outcome)).toBe(true);
  });

  it("returns half the bet on surrender when the dealer upcard is not an Ace", () => {
    const state = applyAction(
      forcePlaying(fresh(), 0, [c(10), c(6)], [c(10), c(10)], [], BET),
      "p1",
      { type: "surrender" },
    );
    expect(state.lastCards.p1!.hands[0]!.outcome?.kind).toBe("surrender");
    expect(state.players[0]!.tokens).toBe(START - BET / 2);
  });

  it("rejects a bet outside the legal range", () => {
    const state = forceBetting(fresh(), 0);
    expect(() => applyAction(state, "p1", { type: "bet", amount: 500 })).toThrow(/不合法/);
    expect(() => applyAction(state, "p1", { type: "bet", amount: 1_500 })).toThrow(/不合法/);
  });

  it("remembers the last wager so the next round can repeat it", () => {
    let state = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 4));
    const id = state.players[state.currentIndex]!.id;
    state = applyAction(state, id, { type: "bet", amount: BET });
    expect(state.lastBets[id]).toBe(BET);
  });
});

describe("table flow", () => {
  it("deals after every seated player has bet", () => {
    let state = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 3));
    for (let i = 0; i < 4; i++) {
      expect(state.phase).toBe("betting");
      const id = state.players[state.currentIndex]!.id;
      state = applyAction(state, id, { type: "bet", amount: DEFAULT_CONFIG.minBet });
    }
    expect(["awaiting", "reveal"]).toContain(state.phase);
    expect(state.dealer.length).toBeGreaterThanOrEqual(2);
    if (state.phase === "awaiting") {
      expect(state.pot).toBe(DEFAULT_CONFIG.minBet * 4);
    }
  });

  it("opens a new betting round after the reveal is advanced", () => {
    let state = forcePlaying(fresh(), 0, [c(10), c(9)], [c(10), c(8)], [], BET);
    if (state.phase === "awaiting") state = applyAction(state, "p1", { type: "stand" });
    expect(state.phase).toBe("reveal");
    state = advance(state);
    expect(state.phase).toBe("betting");
    expect(state.dealsThisHand).toBe(1);
  });

  it("settles the session after the configured number of rounds", () => {
    const config = { ...DEFAULT_CONFIG, roundsUntilSettle: 2 };
    let state = createTable(fourPlayers(), config, 7);
    state = startHand(state);
    let guard = 0;
    while (state.phase !== "settlement" && state.phase !== "gameover" && guard < 80) {
      guard += 1;
      if (state.phase === "betting") {
        const id = state.players[state.currentIndex]!.id;
        state = applyAction(state, id, { type: "bet", amount: config.minBet });
      } else if (state.phase === "awaiting") {
        const id = state.players[state.currentIndex]!.id;
        state = applyAction(state, id, { type: "stand" });
      } else if (state.phase === "reveal") {
        state = advance(state);
      } else {
        break;
      }
    }
    expect(state.phase).toBe("settlement");
    expect(state.settlement?.reason).toBe("rounds");
    state = continueFromSettlement(state);
    expect(state.handNumber).toBe(2);
    expect(state.phase).toBe("betting");
  });

  it("uses a 1K–10K table with a 100K stack over 24 rounds", () => {
    expect(DEFAULT_CONFIG.minBet).toBe(1_000);
    expect(DEFAULT_CONFIG.maxBet).toBe(10_000);
    expect(DEFAULT_CONFIG.roundsUntilSettle).toBe(24);
    expect(DEFAULT_CONFIG.startingTokens).toBe(100_000);
    expect(DEFAULT_CONFIG.seatCount).toBe(4);
    expect(DEFAULT_CONFIG.deckCount).toBe(4);
  });

  it("sizes the shoe from seated player count even if config still has the default deckCount", () => {
    const solo = startHand(
      createTable([{ id: "p1", name: "You", kind: "human" }], { ...DEFAULT_CONFIG, seatCount: 1 }, 1),
    );
    expect(solo.config.deckCount).toBe(1);
    expect(solo.deck).toHaveLength(52);
    expect(solo.logs.some((entry) => entry.kind === "shuffle" && entry.text.includes("1 副"))).toBe(true);

    const four = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 1));
    expect(four.config.deckCount).toBe(decksForSeats(4));
    expect(four.deck).toHaveLength(208);

    const sixPlayers = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      kind: "bot" as const,
    }));
    const six = startHand(createTable(sixPlayers, { ...DEFAULT_CONFIG, seatCount: 6, deckCount: 1 }, 2));
    expect(six.config.deckCount).toBe(6);
    expect(six.deck).toHaveLength(312);
  });

  it("reshuffles when the remaining shoe falls below the cut", () => {
    let state = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 3));
    state.deck = makeDeck(1).slice(0, 10);
    for (let i = 0; i < 4; i++) {
      const id = state.players[state.currentIndex]!.id;
      state = applyAction(state, id, { type: "bet", amount: DEFAULT_CONFIG.minBet });
    }
    const shuffles = state.logs.filter((entry) => entry.kind === "shuffle");
    expect(shuffles.at(-1)?.text).toMatch(/4 副/);
    expect(state.deck.length).toBeGreaterThan(150);
  });

  it("allows 1–6 seated players against the dealer", () => {
    const solo = createTable([{ id: "p1", name: "You", kind: "human" }], { ...DEFAULT_CONFIG, seatCount: 1 }, 1);
    expect(solo.config.seatCount).toBe(1);
    expect(clampSeatCount(0)).toBe(MIN_SEATS);
    expect(clampSeatCount(99)).toBe(MAX_SEATS);
    const started = startHand(solo);
    expect(started.phase).toBe("betting");
    expect(started.players).toHaveLength(1);

    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      kind: "bot" as const,
    }));
    const table = createTable(six, { ...DEFAULT_CONFIG, seatCount: 6 }, 2);
    expect(table.players).toHaveLength(6);

    expect(() =>
      createTable([{ id: "p1", name: "You", kind: "human" }], DEFAULT_CONFIG, 1),
    ).toThrow(/需要 4/);
  });
});
