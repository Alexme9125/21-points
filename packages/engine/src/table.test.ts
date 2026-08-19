import { describe, expect, it } from "vitest";
import {
  advance,
  applyAction,
  continueFromSettlement,
  createTable,
  DEFAULT_CONFIG,
  forceAwaiting,
  startHand,
  toPublicState,
} from "./index.js";
import type { Card, Player, Rank, Suit, TableState } from "./types.js";

const c = (rank: Rank, suit: Suit = "spades"): Card => ({ rank, suit });

function fourPlayers(): Pick<Player, "id" | "name" | "kind">[] {
  return [
    { id: "p1", name: "You", kind: "human" },
    { id: "p2", name: "Claude", kind: "bot" },
    { id: "p3", name: "GPT", kind: "bot" },
    { id: "p4", name: "Kimi", kind: "bot" },
  ];
}

function fresh(pool = 80_000): TableState {
  const table = createTable(fourPlayers(), DEFAULT_CONFIG, 1);
  table.projectPool = pool;
  for (const p of table.players) {
    p.inHand = true;
    p.tokens = DEFAULT_CONFIG.startingTokens;
  }
  return table;
}

describe("applyAction outcomes", () => {
  it("wins when the third card is strictly between the hole ranks", () => {
    let state = forceAwaiting(fresh(), 0, [c(4), c(11)], [c(8, "hearts")]);
    state = applyAction(state, "p1", { type: "add", amount: 10_000 });
    expect(state.outcome?.kind).toBe("win");
    expect(state.outcome?.amount).toBe(10_000);
    expect(state.projectPool).toBe(70_000);
    expect(state.players[0]!.tokens).toBe(510_000);
  });

  it("loses when the third card is outside the spread", () => {
    let state = forceAwaiting(fresh(), 0, [c(4), c(11)], [c(13, "hearts")]);
    state = applyAction(state, "p1", { type: "add", amount: 10_000 });
    expect(state.outcome?.kind).toBe("lose");
    expect(state.players[0]!.tokens).toBe(490_000);
    expect(state.projectPool).toBe(90_000);
  });

  it("charges 2x for a horn and 4x for A-K horn, capped by maxLoss", () => {
    let state = forceAwaiting(fresh(), 0, [c(1), c(9)], [c(1, "hearts")]);
    state = applyAction(state, "p1", { type: "add", amount: 10_000 });
    expect(state.outcome?.kind).toBe("horn");
    expect(state.outcome?.multiplier).toBe(2);
    expect(state.outcome?.amount).toBe(20_000);

    state = forceAwaiting(fresh(), 0, [c(1), c(13)], [c(13, "hearts")]);
    state = applyAction(state, "p1", { type: "add", amount: 80_000 });
    expect(state.outcome?.kind).toBe("horn");
    expect(state.outcome?.multiplier).toBe(4);
    expect(state.outcome?.amount).toBe(DEFAULT_CONFIG.maxLoss);
  });

  it("lets a pair take the whole project pool on a triple", () => {
    let state = forceAwaiting(fresh(40_000), 0, [c(7, "spades"), c(7, "hearts")], [c(7, "clubs")]);
    const rangeMin = DEFAULT_CONFIG.minAdd;
    state = applyAction(state, "p1", { type: "add", amount: rangeMin });
    expect(state.outcome?.kind).toBe("triple_win");
    expect(state.projectPool).toBe(0);
    expect(state.players[0]!.tokens).toBe(540_000);
  });

  it("only deducts the min add when a pair misses", () => {
    let state = forceAwaiting(fresh(), 0, [c(7, "spades"), c(7, "hearts")], [c(2, "clubs")]);
    state = applyAction(state, "p1", { type: "add", amount: DEFAULT_CONFIG.minAdd });
    expect(state.outcome?.kind).toBe("triple_lose");
    expect(state.outcome?.amount).toBe(DEFAULT_CONFIG.minAdd);
  });

  it("rejects a pair add that is not the locked min", () => {
    const state = forceAwaiting(fresh(), 0, [c(7, "spades"), c(7, "hearts")], [c(7, "clubs")]);
    expect(() => applyAction(state, "p1", { type: "add", amount: 20_000 })).toThrow(/不合法/);
  });

  it("clamps add to half tokens, the pool, and maxAdd", () => {
    const table = fresh(1_000_000);
    table.players[0]!.tokens = 30_000;
    const state = forceAwaiting(table, 0, [c(1), c(13)], [c(8)]);
    const pub = toPublicState(state);
    expect(pub.betRange).toEqual({ min: 5_000, max: 15_000, locked: false });
  });
});

describe("table flow", () => {
  it("deals a non-consecutive hole into awaiting with a legal bet range", () => {
    let state = startHand(createTable(fourPlayers(), DEFAULT_CONFIG, 99));
    let guard = 0;
    while (state.phase !== "awaiting" && guard < 12) {
      if (state.phase === "reveal") state = advance(state);
      else break;
      guard += 1;
    }
    expect(state.phase).toBe("awaiting");
    const pub = toPublicState(state);
    expect(pub.betRange).not.toBeNull();
    expect(pub.betRange!.min).toBe(DEFAULT_CONFIG.minAdd);
    expect(pub.betRange!.max).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minAdd);
  });

  it("starts a new hand after the pool is emptied", () => {
    let state = forceAwaiting(fresh(10_000), 0, [c(4), c(11)], [c(8)]);
    state = applyAction(state, "p1", { type: "add", amount: 10_000 });
    expect(state.projectPool).toBe(0);
    state = advance(state);
    expect(state.phase).toBe("settlement");
    expect(state.settlement?.reason).toBe("empty");
    state = continueFromSettlement(state);
    expect(state.handNumber).toBe(1);
    expect(state.projectPool).toBeGreaterThanOrEqual(DEFAULT_CONFIG.ante * 2);
  });

  it("splits half the pool after the configured number of deals", () => {
    let state = createTable(fourPlayers(), DEFAULT_CONFIG, 7);
    state = startHand(state);
    let guard = 0;
    while (state.phase !== "settlement" && state.phase !== "gameover" && guard < 240) {
      guard += 1;
      if (state.phase === "awaiting") {
        const id = state.players[state.currentIndex]!.id;
        state = applyAction(state, id, { type: "fold" });
      }
      if (state.phase === "reveal") state = advance(state);
    }
    expect(state.phase).toBe("settlement");
    expect(state.settlement?.reason).toBe("split");
    expect(state.dealsThisHand).toBe(DEFAULT_CONFIG.dealsUntilSplit);
    expect(state.projectPool).toBeGreaterThan(0);
  });

  it("uses a 50K ante and 40 deals before splitting", () => {
    expect(DEFAULT_CONFIG.ante).toBe(50_000);
    expect(DEFAULT_CONFIG.dealsUntilSplit).toBe(40);
    expect(DEFAULT_CONFIG.minAdd).toBe(5_000);
  });

  it("collects 50K ante from each player into the wish pool", () => {
    let state = createTable(fourPlayers(), DEFAULT_CONFIG, 3);
    state = startHand(state);
    expect(state.players.every((p) => p.tokens === DEFAULT_CONFIG.startingTokens - DEFAULT_CONFIG.ante)).toBe(
      true,
    );
    expect(state.projectPool).toBeGreaterThanOrEqual(DEFAULT_CONFIG.ante * 4);
    expect(state.handNumber).toBe(1);
  });
});
