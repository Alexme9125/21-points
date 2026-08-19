import { cardLabel, makeDeck } from "./cards.js";
import { formatTokens } from "./format.js";
import { nextRng, shuffleInPlace } from "./rng.js";
import {
  canHit,
  dealerShouldHit,
  handLabel,
  handValue,
  hintFor,
  isBlackjack,
  isBust,
  legalActions,
  payoutFor,
} from "./rules.js";
import type {
  ActionType,
  BetRange,
  Card,
  HandState,
  LogEntry,
  LogKind,
  Player,
  PlayerAction,
  PublicDealer,
  PublicState,
  RevealOutcome,
  SeatCards,
  Settlement,
  TableConfig,
  TableState,
} from "./types.js";
import { DEALER_NAME, DEFAULT_CONFIG } from "./types.js";

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

function shuffleDeck(state: TableState): void {
  state.deck = makeDeck();
  state.rng = shuffleInPlace(state.deck, state.rng);
  pushLog(state, "shuffle", "重新洗牌");
}

function draw(state: TableState): Card {
  if (state.deck.length === 0) shuffleDeck(state);
  const card = state.deck.pop();
  if (!card) {
    shuffleDeck(state);
    return draw(state);
  }
  return card;
}

function countInHand(state: TableState): number {
  return state.players.filter((p) => p.inHand && p.tokens >= 0).length;
}

function nextInHandIndex(state: TableState, from: number): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    const p = state.players[idx]!;
    if (p.inHand) return idx;
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

function settleSession(state: TableState, reason: Settlement["reason"]): void {
  state.phase = reason === "gameover" ? "gameover" : "settlement";
  state.settlement = {
    reason,
    deltas: handDeltas(state),
  };
  state.dealer = [];
  state.dealerRevealed = false;
  state.pot = 0;
  if (reason === "gameover") {
    pushLog(state, "gameover", "对局结束");
  }
}

function emptyHand(): HandState {
  return { cards: [], bet: 0, status: "open", fromSplit: false };
}

function seatOf(state: TableState, playerId: string): SeatCards {
  const existing = state.lastCards[playerId];
  if (existing) return existing;
  const created: SeatCards = { hands: [emptyHand()] };
  state.lastCards[playerId] = created;
  return created;
}

function currentSeat(state: TableState): { player: Player; seat: SeatCards; hand: HandState } | null {
  const player = state.players[state.currentIndex];
  if (!player) return null;
  const seat = state.lastCards[player.id];
  const hand = seat?.hands[state.currentHandIndex];
  if (!seat || !hand) return null;
  return { player, seat, hand };
}

function betRangeFor(tokens: number, config: TableConfig): BetRange | null {
  const min = config.minBet;
  const max = Math.min(config.maxBet, tokens);
  if (min <= 0 || max < min) return null;
  return { min, max, locked: min === max };
}

export function computeBetRange(state: TableState): BetRange | null {
  if (state.phase !== "betting") return null;
  const player = state.players[state.currentIndex];
  if (!player) return null;
  return betRangeFor(player.tokens, state.config);
}

function maybeEndSession(state: TableState): boolean {
  const canPlay = state.players.filter((p) => p.tokens >= state.config.minBet).length;
  if (canPlay < 1) {
    settleSession(state, "gameover");
    return true;
  }
  if (state.dealsThisHand >= state.config.roundsUntilSettle) {
    settleSession(state, "rounds");
    return true;
  }
  return false;
}

function beginBetting(state: TableState): void {
  if (maybeEndSession(state)) return;
  state.outcome = null;
  state.dealer = [];
  state.dealerRevealed = false;
  state.pot = 0;
  state.currentHandIndex = 0;
  state.lastCards = {};

  for (const p of state.players) {
    p.inHand = p.tokens >= state.config.minBet;
  }
  if (countInHand(state) < 1) {
    settleSession(state, "gameover");
    return;
  }
  if (!state.players[state.currentIndex]?.inHand) {
    state.currentIndex = nextInHandIndex(state, state.currentIndex);
  }
  state.firstActorIndex = state.currentIndex;
  state.phase = "betting";
}

function dealTo(state: TableState, cards: Card[]): Card {
  const card = draw(state);
  cards.push(card);
  return card;
}

function finishHandStatus(hand: HandState): void {
  if (hand.status !== "open") return;
  if (isBlackjack(hand.cards, hand.fromSplit)) {
    hand.status = "blackjack";
    return;
  }
  if (isBust(hand.cards)) {
    hand.status = "bust";
    return;
  }
  if (hand.cards.length >= 2 && handValue(hand.cards).total === 21) {
    hand.status = "stood";
  }
}

function liveHandsRemain(state: TableState): boolean {
  for (const p of state.players) {
    if (!p.inHand) continue;
    const seat = state.lastCards[p.id];
    if (!seat) continue;
    for (const hand of seat.hands) {
      if (hand.status === "surrender" || hand.status === "bust") continue;
      if (hand.cards.length > 0) return true;
    }
  }
  return false;
}

function settleRound(state: TableState): void {
  state.dealerRevealed = true;
  const dealerLabel = isBlackjack(state.dealer)
    ? "黑杰克"
    : isBust(state.dealer)
      ? "爆牌"
      : handLabel(state.dealer);
  pushLog(state, "dealer", `${DEALER_NAME} ${state.dealer.map(cardLabel).join(" ")}，${dealerLabel}`);

  let firstOutcome: RevealOutcome | null = null;
  for (const player of state.players) {
    const seat = state.lastCards[player.id];
    if (!seat) continue;
    for (const hand of seat.hands) {
      if (hand.cards.length === 0) continue;
      const { kind, payout } = payoutFor(hand, state.dealer);
      const outcome: RevealOutcome = { kind, amount: payout, wager: hand.bet };
      hand.outcome = outcome;
      player.tokens += payout;
      state.pot = Math.max(0, state.pot - hand.bet);
      if (!firstOutcome) firstOutcome = outcome;
      const verb =
        kind === "blackjack"
          ? "黑杰克"
          : kind === "win"
            ? "赢"
            : kind === "push"
              ? "平"
              : kind === "bust"
                ? "爆牌"
                : kind === "surrender"
                  ? "投降"
                  : "输";
      pushLog(
        state,
        kind,
        `${player.name} ${verb}${payout > 0 ? `，收回 ${formatTokens(payout)} Tokens` : ""}`,
        { playerId: player.id, name: player.name, amount: payout },
      );
    }
  }
  state.pot = 0;
  state.outcome = firstOutcome;
  state.phase = "reveal";
  state.dealsThisHand += 1;
}

function playDealerThenSettle(state: TableState): void {
  if (liveHandsRemain(state) && !isBlackjack(state.dealer)) {
    while (dealerShouldHit(state.dealer)) {
      dealTo(state, state.dealer);
    }
  }
  settleRound(state);
}

function findNextOpenHand(
  state: TableState,
  fromPlayer: number,
  fromHand: number,
): { playerIndex: number; handIndex: number } | null {
  const n = state.players.length;
  for (let step = 0; step < n; step++) {
    const idx = (fromPlayer + step) % n;
    const player = state.players[idx]!;
    if (!player.inHand) continue;
    const seat = state.lastCards[player.id];
    if (!seat) continue;
    const startHand = step === 0 ? fromHand : 0;
    for (let h = startHand; h < seat.hands.length; h++) {
      const hand = seat.hands[h]!;
      finishHandStatus(hand);
      if (hand.status === "open") return { playerIndex: idx, handIndex: h };
    }
  }
  return null;
}

function ensureTwoCards(state: TableState, hand: HandState): void {
  if (hand.status === "open" && hand.cards.length === 1) {
    dealTo(state, hand.cards);
    finishHandStatus(hand);
  }
}

function afterHandResolved(state: TableState): void {
  const next = findNextOpenHand(state, state.currentIndex, state.currentHandIndex + 1);
  if (!next) {
    playDealerThenSettle(state);
    return;
  }
  state.currentIndex = next.playerIndex;
  state.currentHandIndex = next.handIndex;
  const seat = state.lastCards[state.players[next.playerIndex]!.id];
  const hand = seat?.hands[next.handIndex];
  if (hand) ensureTwoCards(state, hand);
  if (!hand || hand.status !== "open") {
    afterHandResolved(state);
    return;
  }
  state.phase = "awaiting";
}

function dealRound(state: TableState): void {
  if (state.deck.length < 20) shuffleDeck(state);
  const order: number[] = [];
  let idx = state.firstActorIndex;
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[idx]!.inHand) order.push(idx);
    idx = (idx + 1) % state.players.length;
  }

  for (const i of order) {
    const player = state.players[i]!;
    const seat = seatOf(state, player.id);
    const hand = seat.hands[0]!;
    dealTo(state, hand.cards);
  }
  dealTo(state, state.dealer);
  for (const i of order) {
    const player = state.players[i]!;
    const hand = state.lastCards[player.id]!.hands[0]!;
    dealTo(state, hand.cards);
    finishHandStatus(hand);
    pushLog(
      state,
      "deal",
      `${player.name} 获得 ${hand.cards.map(cardLabel).join(" ")}（${handLabel(hand.cards, hand.fromSplit)}）`,
      { playerId: player.id, name: player.name },
    );
  }
  dealTo(state, state.dealer);
  pushLog(state, "deal", `${DEALER_NAME} 明牌 ${cardLabel(state.dealer[0]!)}`);

  if (isBlackjack(state.dealer)) {
    playDealerThenSettle(state);
    return;
  }

  const first = findNextOpenHand(state, state.firstActorIndex, 0);
  if (!first) {
    playDealerThenSettle(state);
    return;
  }
  state.currentIndex = first.playerIndex;
  state.currentHandIndex = first.handIndex;
  state.phase = "awaiting";
}

function afterBetAdvance(state: TableState): void {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentIndex + step) % n;
    const player = state.players[idx]!;
    if (!player.inHand) continue;
    const bet = state.lastCards[player.id]?.hands[0]?.bet ?? 0;
    if (bet <= 0) {
      state.currentIndex = idx;
      state.phase = "betting";
      return;
    }
  }
  dealRound(state);
}

export function createTable(
  players: Array<Pick<Player, "id" | "name" | "kind" | "personaId">>,
  config?: TableConfig,
  seed = Date.now() % 0x7fffffff,
): TableState {
  const resolved: TableConfig = { ...DEFAULT_CONFIG, ...config };
  if (players.length !== resolved.seatCount) {
    throw new Error(`需要 ${resolved.seatCount} 名玩家`);
  }
  return {
    config: resolved,
    players: players.map((p) => ({
      ...p,
      tokens: resolved.startingTokens,
      inHand: false,
    })),
    phase: "idle",
    rng: seed,
    deck: [],
    dealer: [],
    dealerRevealed: false,
    pot: 0,
    firstActorIndex: 0,
    currentIndex: 0,
    currentHandIndex: 0,
    dealsThisHand: 0,
    handNumber: 0,
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
  next.lastCards = {};
  next.dealsThisHand = 0;
  next.handNumber += 1;
  next.dealer = [];
  next.dealerRevealed = false;
  next.pot = 0;
  next.currentHandIndex = 0;

  const tokensAtHandStart: Record<string, number> = {};
  for (const p of next.players) {
    tokensAtHandStart[p.id] = p.tokens;
    p.inHand = p.tokens >= next.config.minBet;
  }
  next.tokensAtHandStart = tokensAtHandStart;

  if (countInHand(next) < 1) {
    settleSession(next, "gameover");
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
  beginBetting(next);
  return next;
}

function applyBet(state: TableState, amount: number): void {
  const player = state.players[state.currentIndex];
  if (!player) throw new Error("没有当前玩家");
  const range = betRangeFor(player.tokens, state.config);
  if (!range) throw new Error("筹码不足，无法下注");
  if (amount < range.min || amount > range.max) throw new Error("下注数量不合法");
  player.tokens -= amount;
  state.pot += amount;
  const seat = seatOf(state, player.id);
  seat.hands = [{ cards: [], bet: amount, status: "open", fromSplit: false }];
  pushLog(state, "bet", `${player.name} 下注 ${formatTokens(amount)} Tokens`, {
    playerId: player.id,
    name: player.name,
    amount,
  });
  afterBetAdvance(state);
}

function standHand(state: TableState, hand: HandState, player: Player, silent = false): void {
  if (hand.status === "open") {
    finishHandStatus(hand);
    if (hand.status === "open") hand.status = "stood";
  }
  if (!silent) {
    pushLog(state, "stand", `${player.name} 停牌，${handLabel(hand.cards, hand.fromSplit)}`, {
      playerId: player.id,
      name: player.name,
    });
  }
  afterHandResolved(state);
}

function applyHit(state: TableState): void {
  const cur = currentSeat(state);
  if (!cur) throw new Error("当前没有手牌");
  if (!canHit(cur.hand)) throw new Error("不能要牌");
  const card = dealTo(state, cur.hand.cards);
  pushLog(
    state,
    "hit",
    `${cur.player.name} 要牌 ${cardLabel(card)}，${handLabel(cur.hand.cards, cur.hand.fromSplit)}`,
    { playerId: cur.player.id, name: cur.player.name },
  );
  finishHandStatus(cur.hand);
  if (cur.hand.status === "bust") {
    pushLog(state, "bust", `${cur.player.name} 爆牌`, {
      playerId: cur.player.id,
      name: cur.player.name,
    });
    afterHandResolved(state);
    return;
  }
  if (cur.hand.status !== "open" || !canHit(cur.hand)) {
    if (cur.hand.status === "open") cur.hand.status = "stood";
    afterHandResolved(state);
  }
}

function applyDouble(state: TableState): void {
  const cur = currentSeat(state);
  if (!cur) throw new Error("当前没有手牌");
  const extra = cur.hand.bet;
  if (cur.player.tokens < extra) throw new Error("筹码不足，无法加倍");
  if (cur.hand.cards.length !== 2) throw new Error("只能在前两张加倍");
  if (isBlackjack(cur.hand.cards, cur.hand.fromSplit)) throw new Error("黑杰克不能加倍");
  cur.player.tokens -= extra;
  cur.hand.bet += extra;
  state.pot += extra;
  const card = dealTo(state, cur.hand.cards);
  pushLog(
    state,
    "double",
    `${cur.player.name} 加倍，补 ${cardLabel(card)}，${handLabel(cur.hand.cards, cur.hand.fromSplit)}`,
    { playerId: cur.player.id, name: cur.player.name, amount: extra },
  );
  if (isBust(cur.hand.cards)) {
    cur.hand.status = "bust";
    pushLog(state, "bust", `${cur.player.name} 爆牌`, {
      playerId: cur.player.id,
      name: cur.player.name,
    });
  } else {
    cur.hand.status = "stood";
  }
  afterHandResolved(state);
}

function applySplit(state: TableState): void {
  const cur = currentSeat(state);
  if (!cur) throw new Error("当前没有手牌");
  if (cur.hand.fromSplit) throw new Error("不能再分牌");
  if (cur.hand.cards.length !== 2 || cur.hand.cards[0]!.rank !== cur.hand.cards[1]!.rank) {
    throw new Error("只有同点对子可以分牌");
  }
  const extra = cur.hand.bet;
  if (cur.player.tokens < extra) throw new Error("筹码不足，无法分牌");
  cur.player.tokens -= extra;
  state.pot += extra;
  const second: Card = cur.hand.cards.pop()!;
  const right: HandState = {
    cards: [second],
    bet: extra,
    status: "open",
    fromSplit: true,
  };
  cur.hand.fromSplit = true;
  cur.seat.hands.splice(state.currentHandIndex + 1, 0, right);
  dealTo(state, cur.hand.cards);
  finishHandStatus(cur.hand);
  pushLog(state, "split", `${cur.player.name} 分牌`, {
    playerId: cur.player.id,
    name: cur.player.name,
    amount: extra,
  });
  if (cur.hand.cards[0]!.rank === 1) {
    // 分牌 A 各补一张后停
    dealTo(state, right.cards);
    cur.hand.status = cur.hand.status === "open" ? "stood" : cur.hand.status;
    right.status = "stood";
    afterHandResolved(state);
    return;
  }
  if (cur.hand.status !== "open") {
    afterHandResolved(state);
  }
}

function applySurrender(state: TableState): void {
  const cur = currentSeat(state);
  if (!cur) throw new Error("当前没有手牌");
  if (cur.hand.cards.length !== 2 || cur.hand.fromSplit) throw new Error("现在不能投降");
  if (state.dealer[0]?.rank === 1) throw new Error("庄家明牌是 A，不能投降");
  cur.hand.status = "surrender";
  pushLog(state, "surrender", `${cur.player.name} 投降，收回一半赌注`, {
    playerId: cur.player.id,
    name: cur.player.name,
  });
  afterHandResolved(state);
}

export function applyAction(state: TableState, playerId: string, action: PlayerAction): TableState {
  const player = state.players[state.currentIndex];
  if (!player || player.id !== playerId) {
    throw new Error("还没轮到该玩家");
  }
  if (state.phase !== "betting" && state.phase !== "awaiting") {
    throw new Error("当前不能行动");
  }
  if (state.phase === "betting" && action.type !== "bet") {
    throw new Error("现在请先下注");
  }
  if (state.phase === "awaiting" && action.type === "bet") {
    throw new Error("已经下过注了");
  }

  const next = clone(state);
  if (action.type === "bet") {
    applyBet(next, action.amount);
    return next;
  }
  const allowed = legalActions(next);
  if (!allowed.includes(action.type as ActionType)) {
    throw new Error("该行动不合法");
  }
  if (action.type === "hit") applyHit(next);
  else if (action.type === "stand") {
    const cur = currentSeat(next);
    if (!cur) throw new Error("当前没有手牌");
    standHand(next, cur.hand, cur.player);
  } else if (action.type === "double") applyDouble(next);
  else if (action.type === "split") applySplit(next);
  else if (action.type === "surrender") applySurrender(next);
  return next;
}

export function advance(state: TableState): TableState {
  if (state.phase !== "reveal") return state;
  const next = clone(state);
  next.outcome = null;
  next.currentIndex = nextInHandIndex(next, next.firstActorIndex);
  beginBetting(next);
  return next;
}

export function continueFromSettlement(state: TableState): TableState {
  if (state.phase === "gameover") return state;
  if (state.phase !== "settlement") return state;
  return startHand(state);
}

function publicDealer(state: TableState): PublicDealer {
  const show = state.dealerRevealed || state.phase === "reveal" || state.phase === "settlement";
  const cards = show ? state.dealer : state.dealer.slice(0, 1);
  const total = show && state.dealer.length ? handValue(state.dealer).total : null;
  return {
    cards,
    hidden: !show && state.dealer.length > 1,
    total,
    bust: Boolean(show && isBust(state.dealer)),
    blackjack: Boolean(show && isBlackjack(state.dealer)),
  };
}

export function toPublicState(state: TableState): PublicState {
  const acting = state.phase === "betting" || state.phase === "awaiting";
  const current = acting ? state.players[state.currentIndex] : undefined;
  const cur = acting ? currentSeat(state) : null;
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
    dealer: publicDealer(state),
    pot: state.pot,
    currentIndex: state.currentIndex,
    currentPlayerId: current?.id ?? null,
    currentHandIndex: state.currentHandIndex,
    firstActorIndex: state.firstActorIndex,
    dealsThisHand: state.dealsThisHand,
    handNumber: state.handNumber,
    outcome: state.outcome,
    hint: cur ? hintFor(cur.hand.cards, state.dealer[0], cur.hand.fromSplit) : null,
    betRange: computeBetRange(state),
    legalActions: legalActions(state),
    logs: state.logs.slice(-24),
    settlement: state.settlement,
  };
}

export function currentPlayer(state: TableState): Player | undefined {
  return state.players[state.currentIndex];
}

export function forceBetting(state: TableState, playerIndex: number): TableState {
  const next = clone(state);
  next.phase = "betting";
  next.currentIndex = playerIndex;
  next.currentHandIndex = 0;
  next.dealer = [];
  next.dealerRevealed = false;
  next.outcome = null;
  next.settlement = null;
  next.lastCards = {};
  next.pot = 0;
  for (const p of next.players) p.inHand = p.tokens >= next.config.minBet;
  next.players[playerIndex]!.inHand = true;
  return next;
}

/** Upcoming cards are dealt via pop() (last item first). */
export function forcePlaying(
  state: TableState,
  playerIndex: number,
  cards: Card[],
  dealer: Card[],
  upcoming: Card[] = [],
  bet = state.config.minBet,
): TableState {
  const next = clone(state);
  next.phase = "awaiting";
  next.currentIndex = playerIndex;
  next.currentHandIndex = 0;
  next.dealer = [...dealer];
  next.dealerRevealed = false;
  next.outcome = null;
  next.settlement = null;
  next.pot = 0;
  for (const p of next.players) p.inHand = false;
  const player = next.players[playerIndex]!;
  player.inHand = true;
  const paid = Math.min(bet, player.tokens);
  player.tokens -= paid;
  const hand: HandState = {
    cards: [...cards],
    bet: paid,
    status: "open",
    fromSplit: false,
  };
  finishHandStatus(hand);
  next.lastCards = { [player.id]: { hands: [hand] } };
  next.pot = paid;
  next.deck = [...upcoming].reverse();
  if (hand.status !== "open") playDealerThenSettle(next);
  return next;
}
