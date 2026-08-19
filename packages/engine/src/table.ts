import { cardLabel, makeDeck } from "./cards.js";
import { formatTokens } from "./format.js";
import { nextRng, shuffleInPlace } from "./rng.js";
import { holeHint, holeKind, isAceKing, orderedRanks } from "./rules.js";
import type {
  BetRange,
  Card,
  LogEntry,
  LogKind,
  Player,
  PlayerAction,
  PublicState,
  RevealOutcome,
  Settlement,
  TableConfig,
  TableState,
} from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function pushLog(
  state: TableState,
  kind: LogKind,
  text: string,
  extra: Partial<LogEntry> = {},
): void {
  state.logSeq += 1;
  state.logs.push({
    id: state.logSeq,
    kind,
    text,
    ...extra,
  });
  if (state.logs.length > 80) {
    state.logs = state.logs.slice(-60);
  }
}

function playerName(state: TableState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? id;
}

function shuffleDeck(state: TableState): void {
  state.deck = makeDeck();
  state.rng = shuffleInPlace(state.deck, state.rng);
  pushLog(state, "shuffle", "重新洗牌");
}

function draw(state: TableState): Card {
  const card = state.deck.pop();
  if (!card) {
    shuffleDeck(state);
    return draw(state);
  }
  return card;
}

function transferToPool(state: TableState, player: Player, amount: number): number {
  const paid = Math.max(0, Math.min(amount, player.tokens, state.config.maxLoss));
  player.tokens -= paid;
  state.projectPool += paid;
  if (player.tokens <= 0) player.inHand = false;
  return paid;
}

function transferFromPool(state: TableState, player: Player, amount: number): number {
  const won = Math.max(0, Math.min(amount, state.projectPool));
  state.projectPool -= won;
  player.tokens += won;
  return won;
}

function countInHand(state: TableState): number {
  return state.players.filter((p) => p.inHand && p.tokens > 0).length;
}

function nextInHandIndex(state: TableState, from: number): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    const p = state.players[idx]!;
    if (p.inHand && p.tokens > 0) return idx;
  }
  return from;
}

function handDeltas(state: TableState): Record<string, number> {
  const deltas: Record<string, number> = {};
  for (const p of state.players) {
    const start = state.tokensAtHandStart[p.id] ?? p.tokens;
    deltas[p.id] = p.tokens - start;
  }
  return deltas;
}

function settle(state: TableState, reason: Settlement["reason"], extra: Partial<Settlement> = {}): void {
  state.phase = reason === "gameover" ? "gameover" : "settlement";
  state.settlement = {
    reason,
    deltas: handDeltas(state),
    leftoverPool: state.projectPool,
    ...extra,
  };
  state.hole = null;
  state.third = null;
  if (reason === "gameover") {
    pushLog(state, "gameover", "对局结束");
  }
}

function splitPool(state: TableState): void {
  const recipients = state.players.filter((p) => p.tokens > 0);
  const half = Math.floor(state.projectPool / 2);
  const n = Math.max(1, recipients.length);
  const each = Math.floor(half / n);
  const distributed = each * recipients.length;
  state.projectPool -= distributed;
  for (const p of recipients) p.tokens += each;
  pushLog(
    state,
    "split",
    `满 ${state.config.dealsUntilSplit} 次发牌，项目池一半平分，每人 ${formatTokens(each)} Tokens`,
    { amount: each },
  );
  settle(state, "split", { splitEach: each });
}

function maybeEndBeforeDeal(state: TableState): boolean {
  if (state.projectPool <= 0) {
    pushLog(state, "pool_empty", "项目池已被清空");
    settle(state, "empty");
    return true;
  }
  if (state.dealsThisHand >= state.config.dealsUntilSplit) {
    splitPool(state);
    return true;
  }
  if (countInHand(state) < 2) {
    const leftover = state.projectPool;
    if (leftover > 0) {
      const alive = state.players.filter((p) => p.tokens > 0);
      if (alive.length === 1) {
        alive[0]!.tokens += leftover;
        state.projectPool = 0;
      } else if (alive.length > 1) {
        const each = Math.floor(leftover / alive.length);
        for (const p of alive) p.tokens += each;
        state.projectPool -= each * alive.length;
      }
    }
    settle(state, "gameover");
    return true;
  }
  return false;
}

function dealToCurrent(state: TableState): void {
  if (state.orbitDeals >= state.players.length) {
    shuffleDeck(state);
    state.orbitDeals = 0;
    state.lastCards = {};
  }

  const player = state.players[state.currentIndex]!;
  const a = draw(state);
  const b = draw(state);
  state.hole = [a, b];
  state.third = null;
  state.outcome = null;
  state.dealsThisHand += 1;
  state.orbitDeals += 1;
  state.lastCards[player.id] = { hole: [a, b] };

  pushLog(state, "deal", `${player.name} 获得 ${cardLabel(a)} ${cardLabel(b)}`, {
    playerId: player.id,
    name: player.name,
  });

  if (holeKind(a, b) === "consecutive") {
    const outcome: RevealOutcome = { kind: "consecutive", amount: 0 };
    state.outcome = outcome;
    state.lastCards[player.id] = { hole: [a, b], outcome };
    state.phase = "reveal";
    pushLog(state, "consecutive", `${player.name} 连张，系统自动放弃`, {
      playerId: player.id,
      name: player.name,
    });
    return;
  }

  const range = betRangeFor(player.tokens, [a, b], state.projectPool, state.config);
  if (!range) {
    const outcome: RevealOutcome = { kind: "fold", amount: 0 };
    state.outcome = outcome;
    state.lastCards[player.id] = { hole: [a, b], outcome };
    state.phase = "reveal";
    pushLog(state, "fold", `${player.name} 无法添菜，自动放弃`, {
      playerId: player.id,
      name: player.name,
    });
    return;
  }

  state.phase = "awaiting";
}

function beginDealCycle(state: TableState): void {
  if (maybeEndBeforeDeal(state)) return;
  dealToCurrent(state);
}

function afterRevealAdvance(state: TableState): void {
  if (state.phase !== "reveal") return;
  if (maybeEndBeforeDeal(state)) return;
  state.currentIndex = nextInHandIndex(state, state.currentIndex);
  beginDealCycle(state);
}

export function betRangeFor(
  tokens: number,
  hole: [Card, Card],
  pool: number,
  config: TableConfig,
): BetRange | null {
  const kind = holeKind(hole[0], hole[1]);
  if (kind === "consecutive") return null;

  const half = Math.floor(tokens / 2);
  const max = Math.min(pool, half, config.maxAdd);
  const min = Math.min(config.minAdd, pool);
  if (min <= 0 || max <= 0 || min > max) return null;

  if (kind === "pair") {
    const locked = Math.min(config.minAdd, max);
    if (locked <= 0) return null;
    return { min: locked, max: locked, locked: true };
  }
  return { min, max, locked: false };
}

export function computeBetRange(state: TableState): BetRange | null {
  if (state.phase !== "awaiting" || !state.hole) return null;
  const player = state.players[state.currentIndex];
  if (!player) return null;
  return betRangeFor(player.tokens, state.hole, state.projectPool, state.config);
}

export function createTable(
  players: Array<Pick<Player, "id" | "name" | "kind" | "personaId">>,
  config: TableConfig = DEFAULT_CONFIG,
  seed = Date.now() % 0x7fffffff,
): TableState {
  if (players.length !== config.seatCount) {
    throw new Error(`需要 ${config.seatCount} 名玩家`);
  }
  return {
    config,
    players: players.map((p) => ({
      ...p,
      tokens: config.startingTokens,
      inHand: false,
    })),
    phase: "idle",
    rng: seed,
    deck: [],
    projectPool: 0,
    firstActorIndex: 0,
    currentIndex: 0,
    orbitDeals: 0,
    dealsThisHand: 0,
    handNumber: 0,
    hole: null,
    third: null,
    outcome: null,
    logs: [],
    logSeq: 0,
    lastCards: {},
    tokensAtHandStart: {},
    settlement: null,
  };
}

export function startHand(state: TableState): TableState {
  const next = clone(state);
  next.settlement = null;
  next.outcome = null;
  next.hole = null;
  next.third = null;
  next.lastCards = {};
  next.dealsThisHand = 0;
  next.orbitDeals = 0;
  next.handNumber += 1;

  const tokensAtHandStart: Record<string, number> = {};
  for (const p of next.players) {
    tokensAtHandStart[p.id] = p.tokens;
    if (p.tokens >= next.config.ante) {
      p.tokens -= next.config.ante;
      next.projectPool += next.config.ante;
      p.inHand = true;
      pushLog(next, "ante", `${p.name} 向项目池投入 ${formatTokens(next.config.ante)} Tokens`, {
        playerId: p.id,
        name: p.name,
        amount: next.config.ante,
      });
    } else {
      p.inHand = false;
    }
  }
  next.tokensAtHandStart = tokensAtHandStart;

  if (countInHand(next) < 2) {
    settle(next, "gameover");
    return next;
  }

  if (next.handNumber === 1) {
    const step = nextRng(next.rng);
    next.rng = step.rng;
    const activeIdx = next.players
      .map((p, i) => (p.inHand ? i : -1))
      .filter((i) => i >= 0);
    next.firstActorIndex = activeIdx[Math.floor(step.value * activeIdx.length)] ?? 0;
  } else {
    next.firstActorIndex = nextInHandIndex(next, next.firstActorIndex);
  }
  next.currentIndex = next.firstActorIndex;
  if (!next.players[next.currentIndex]?.inHand) {
    next.currentIndex = nextInHandIndex(next, next.currentIndex);
    next.firstActorIndex = next.currentIndex;
  }

  shuffleDeck(next);
  beginDealCycle(next);
  return next;
}

export function applyAction(state: TableState, playerId: string, action: PlayerAction): TableState {
  if (state.phase !== "awaiting" || !state.hole) {
    throw new Error("当前不能行动");
  }
  const player = state.players[state.currentIndex];
  if (!player || player.id !== playerId) {
    throw new Error("还没轮到该玩家");
  }

  const next = clone(state);
  const actor = next.players[next.currentIndex]!;
  const hole = next.hole!;

  if (action.type === "fold") {
    const outcome: RevealOutcome = { kind: "fold", amount: 0 };
    next.outcome = outcome;
    next.lastCards[actor.id] = { hole, outcome };
    next.phase = "reveal";
    pushLog(next, "fold", `${actor.name} 放弃`, { playerId: actor.id, name: actor.name });
    return next;
  }

  const range = computeBetRange(next);
  if (!range) throw new Error("无法添菜");
  const amount = action.amount;
  if (amount < range.min || amount > range.max) {
    throw new Error("添菜数量不合法");
  }

  const third = draw(next);
  next.third = third;
  pushLog(next, "add", `${actor.name} 向项目池添菜 ${formatTokens(amount)} Tokens`, {
    playerId: actor.id,
    name: actor.name,
    amount,
  });

  const kind = holeKind(hole[0], hole[1]);
  let outcome: RevealOutcome;

  if (kind === "pair") {
    if (third.rank === hole[0].rank) {
      const won = transferFromPool(next, actor, next.projectPool);
      outcome = { kind: "triple_win", amount: won, third };
      pushLog(next, "triple_win", `${actor.name} 开出三张，通吃项目池 ${formatTokens(won)} Tokens`, {
        playerId: actor.id,
        name: actor.name,
        amount: won,
      });
    } else {
      const lost = transferToPool(next, actor, amount);
      outcome = { kind: "triple_lose", amount: lost, third };
      pushLog(next, "triple_lose", `${actor.name} 未开出三张，扣除 ${formatTokens(lost)} Tokens`, {
        playerId: actor.id,
        name: actor.name,
        amount: lost,
      });
    }
  } else {
    const { low, high } = orderedRanks(hole[0], hole[1]);
    if (third.rank === hole[0].rank || third.rank === hole[1].rank) {
      const multiplier = isAceKing(hole[0], hole[1]) ? 4 : 2;
      const lost = transferToPool(next, actor, amount * multiplier);
      outcome = { kind: "horn", amount: lost, multiplier, third };
      pushLog(
        next,
        "horn",
        `${actor.name} 钻了牛角尖（×${multiplier}），扣除 ${formatTokens(lost)} Tokens`,
        { playerId: actor.id, name: actor.name, amount: lost },
      );
    } else if (third.rank > low && third.rank < high) {
      const won = transferFromPool(next, actor, amount);
      outcome = { kind: "win", amount: won, third };
      pushLog(next, "win", `${actor.name} 吃进项目池 ${formatTokens(won)} Tokens`, {
        playerId: actor.id,
        name: actor.name,
        amount: won,
      });
    } else {
      const lost = transferToPool(next, actor, amount);
      outcome = { kind: "lose", amount: lost, third };
      pushLog(next, "lose", `${actor.name} 未中区间，投入 ${formatTokens(lost)} Tokens`, {
        playerId: actor.id,
        name: actor.name,
        amount: lost,
      });
    }
  }

  next.outcome = outcome;
  next.lastCards[actor.id] = { hole, third, outcome };
  next.phase = "reveal";
  return next;
}

export function advance(state: TableState): TableState {
  if (state.phase !== "reveal") return state;
  const next = clone(state);
  afterRevealAdvance(next);
  return next;
}

export function continueFromSettlement(state: TableState): TableState {
  if (state.phase === "gameover") return state;
  if (state.phase !== "settlement") return state;
  return startHand(state);
}

export function toPublicState(state: TableState): PublicState {
  const current = state.phase === "awaiting" || state.phase === "reveal"
    ? state.players[state.currentIndex]
    : undefined;
  return {
    phase: state.phase,
    config: state.config,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      personaId: p.personaId,
      tokens: p.tokens,
      inHand: p.inHand,
      cards: state.lastCards[p.id],
    })),
    projectPool: state.projectPool,
    currentIndex: state.currentIndex,
    currentPlayerId: current?.id ?? null,
    firstActorIndex: state.firstActorIndex,
    orbitDeals: state.orbitDeals,
    dealsThisHand: state.dealsThisHand,
    handNumber: state.handNumber,
    hole: state.hole,
    third: state.third,
    outcome: state.outcome,
    hint: state.hole ? holeHint(state.hole[0], state.hole[1]) : null,
    betRange: computeBetRange(state),
    logs: state.logs.slice(-24),
    settlement: state.settlement,
  };
}

export function currentPlayer(state: TableState): Player | undefined {
  return state.players[state.currentIndex];
}

export { playerName };

/** Test helper: put the current player into awaiting with a known hole. Upcoming cards are dealt via pop(). */
export function forceAwaiting(
  state: TableState,
  playerIndex: number,
  hole: [Card, Card],
  upcoming: Card[] = [],
): TableState {
  const next = clone(state);
  next.phase = "awaiting";
  next.currentIndex = playerIndex;
  next.hole = hole;
  next.third = null;
  next.outcome = null;
  next.settlement = null;
  const player = next.players[playerIndex]!;
  player.inHand = true;
  next.lastCards[player.id] = { hole };
  next.deck = [...upcoming].reverse();
  return next;
}
