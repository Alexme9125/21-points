import { describe, expect, it } from "vitest";
import { makeDeck } from "./cards.js";
import {
  botThinkMs,
  chooseBotAction,
  createTable,
  DEFAULT_CONFIG,
  evaluateSpot,
  forceAwaiting,
  styleForPersona,
} from "./index.js";
import type { Card, Player, Rank, Suit, TableState } from "./types.js";

const c = (rank: Rank, suit: Suit = "spades"): Card => ({ rank, suit });

function fourBots(): Pick<Player, "id" | "name" | "kind" | "personaId">[] {
  return [
    { id: "p1", name: "Bot", kind: "bot", personaId: "claude" },
    { id: "p2", name: "B2", kind: "bot", personaId: "gpt" },
    { id: "p3", name: "B3", kind: "bot", personaId: "gemini" },
    { id: "p4", name: "B4", kind: "bot", personaId: "deepseek" },
  ];
}

function sameRank(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

function leftoverDeck(hole: [Card, Card]): Card[] {
  return makeDeck().filter((card) => !hole.some((h) => sameRank(h, card)));
}

function awaitingWith(
  personaId: string,
  hole: [Card, Card],
  pool = 200_000,
): TableState {
  const players = fourBots();
  players[0] = { ...players[0]!, personaId, name: personaId };
  const table = createTable(players, { ...DEFAULT_CONFIG }, 11);
  table.projectPool = pool;
  for (const p of table.players) {
    p.inHand = true;
    p.tokens = DEFAULT_CONFIG.startingTokens - DEFAULT_CONFIG.ante;
  }
  return forceAwaiting(table, 0, hole, leftoverDeck(hole));
}

function foldRate(personaId: string, hole: [Card, Card], n = 48): number {
  let folds = 0;
  for (let i = 0; i < n; i++) {
    const action = chooseBotAction(awaitingWith(personaId, hole));
    if (action.type === "fold") folds += 1;
  }
  return folds / n;
}

describe("bot personas", () => {
  it("treats a 3-J spread as roughly break-even", () => {
    const spot = evaluateSpot(awaitingWith("gpt", [c(3), c(11)]));
    expect(spot?.kind).toBe("spread");
    expect(spot?.unitEv ?? 99).toBeCloseTo(0, 1);
  });

  it("lets cautious bots fold a scratchy 3-J more often than aggressive ones", () => {
    const hole: [Card, Card] = [c(3), c(11)];
    const claude = foldRate("claude", hole);
    const gpt = foldRate("gpt", hole);
    const gemini = foldRate("gemini", hole);
    const deepseek = foldRate("deepseek", hole);
    expect(claude).toBeGreaterThan(0.7);
    expect(gpt).toBeGreaterThan(0.65);
    expect(gemini).toBeLessThan(0.45);
    expect(deepseek).toBeLessThan(0.4);
    expect(claude).toBeGreaterThan(deepseek);
    expect(gpt).toBeGreaterThan(gemini);
  });

  it("still only posts the locked min add on a pair, even when aggressive", () => {
    const hole: [Card, Card] = [c(7, "spades"), c(7, "hearts")];
    for (let i = 0; i < 24; i++) {
      const action = chooseBotAction(awaitingWith("deepseek", hole));
      if (action.type === "add") {
        expect(action.amount).toBe(DEFAULT_CONFIG.minAdd);
      }
    }
  });

  it("sizes A-K smaller for Claude than DeepSeek on average", () => {
    const hole: [Card, Card] = [c(1), c(13)];
    const avg = (id: string) => {
      const amounts: number[] = [];
      for (let i = 0; i < 36; i++) {
        const action = chooseBotAction(awaitingWith(id, hole));
        if (action.type === "add") amounts.push(action.amount);
      }
      expect(amounts.length).toBeGreaterThan(10);
      return amounts.reduce((a, b) => a + b, 0) / amounts.length;
    };
    expect(avg("claude")).toBeLessThan(avg("deepseek"));
  });

  it("tanks at least a few seconds so the table can see them think", () => {
    const state = awaitingWith("gemini", [c(3), c(11)]);
    for (let i = 0; i < 12; i++) {
      const ms = botThinkMs(state);
      expect(ms).toBeGreaterThanOrEqual(5_200);
      expect(ms).toBeLessThanOrEqual(16_000);
    }
    const cautious = styleForPersona("claude");
    const aggro = styleForPersona("deepseek");
    expect(cautious.foldBelow).toBeGreaterThan(aggro.foldBelow);
    expect(cautious.thinkMin).toBeGreaterThan(aggro.thinkMin);
    expect(aggro.sizeBias).toBeGreaterThan(cautious.sizeBias);
  });
});
