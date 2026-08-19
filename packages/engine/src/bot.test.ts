import { describe, expect, it } from "vitest";
import { makeDeck } from "./cards.js";
import {
  basicPlay,
  botThinkMs,
  chooseBotAction,
  createTable,
  DEFAULT_CONFIG,
  forceBetting,
  forcePlaying,
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

function tableWith(personaId: string): TableState {
  const players = fourBots();
  players[0] = { ...players[0]!, personaId, name: personaId };
  return createTable(players, { ...DEFAULT_CONFIG }, 11);
}

describe("basic strategy", () => {
  it("stands a hard 18 and hits a 12 versus 7", () => {
    expect(basicPlay([c(10), c(8)], false, 10, ["hit", "stand"])).toBe("stand");
    expect(basicPlay([c(5), c(7)], false, 7, ["hit", "stand"])).toBe("hit");
  });

  it("splits aces and eights, and doubles a hard 11 versus 6", () => {
    expect(basicPlay([c(1, "spades"), c(1, "hearts")], false, 10, ["hit", "stand", "split"])).toBe(
      "split",
    );
    expect(basicPlay([c(8, "spades"), c(8, "hearts")], false, 9, ["hit", "stand", "split"])).toBe(
      "split",
    );
    expect(basicPlay([c(5), c(6)], false, 6, ["hit", "stand", "double"])).toBe("double");
  });
});

describe("bot personas", () => {
  it("always posts a legal bet in the betting phase", () => {
    for (const id of ["claude", "deepseek", "gemini"] as const) {
      const amounts: number[] = [];
      for (let i = 0; i < 24; i++) {
        const state = forceBetting(tableWith(id), 0);
        const action = chooseBotAction(state);
        expect(action.type).toBe("bet");
        if (action.type === "bet") amounts.push(action.amount);
      }
      expect(Math.min(...amounts)).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minBet);
      expect(Math.max(...amounts)).toBeLessThanOrEqual(DEFAULT_CONFIG.maxBet);
    }
  });

  it("sizes bets larger for aggressive personas", () => {
    const avg = (id: string) => {
      let sum = 0;
      for (let i = 0; i < 40; i++) {
        const action = chooseBotAction(forceBetting(tableWith(id), 0));
        if (action.type === "bet") sum += action.amount;
      }
      return sum / 40;
    };
    expect(avg("claude")).toBeLessThan(avg("deepseek"));
    expect(avg("gpt")).toBeLessThan(avg("gemini"));
  });

  it("usually stands a hard 18 versus a ten", () => {
    let stands = 0;
    for (let i = 0; i < 30; i++) {
      const state = forcePlaying(tableWith("gpt"), 0, [c(10), c(8)], [c(13), c(7)], makeDeck());
      const action = chooseBotAction(state);
      if (action.type === "stand") stands += 1;
    }
    expect(stands).toBeGreaterThan(24);
  });

  it("tanks at least a few seconds so the table can see them think", () => {
    const state = forcePlaying(tableWith("gemini"), 0, [c(10), c(6)], [c(10), c(7)]);
    for (let i = 0; i < 12; i++) {
      const ms = botThinkMs(state);
      expect(ms).toBeGreaterThanOrEqual(3_600);
      expect(ms).toBeLessThanOrEqual(12_000);
    }
    const cautious = styleForPersona("claude");
    const aggro = styleForPersona("deepseek");
    expect(cautious.scratch).toBeGreaterThan(aggro.scratch);
    expect(cautious.shove).toBeLessThan(aggro.shove);
    expect(aggro.sizeBias).toBeGreaterThan(cautious.sizeBias);
  });
});
