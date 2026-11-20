import { betChipAmounts, clampBet } from "./bets.js";
import { CARDS_PER_DECK, rankLabel } from "./cards.js";
import { styleForPersona, type PlayStyle } from "./personas.js";
import { canHit, handValue, isBlackjack, isBust, legalActions, pipValue } from "./rules.js";
import { computeBetRange, currentPlayer, deriveBotMood } from "./table.js";
import type {
  ActionType,
  BotCue,
  BotMood,
  BotPace,
  BotReaction,
  Card,
  HandState,
  Player,
  PlayerAction,
  PlayerMemory,
  PublicState,
  TableState,
} from "./types.js";

function dealerUp(state: TableState): number {
  const card = state.dealer[0];
  if (!card) return 10;
  const v = pipValue(card.rank);
  return card.rank === 1 ? 11 : v;
}

function currentHand(state: TableState): HandState | null {
  const player = currentPlayer(state);
  if (!player) return null;
  return state.lastCards[player.id]?.hands[state.currentHandIndex] ?? null;
}

function pickFrom<T>(items: readonly T[], seed?: number): T {
  if (items.length === 0) throw new Error("empty list");
  if (seed !== undefined) {
    const idx = Math.abs(Math.floor(seed)) % items.length;
    return items[idx]!;
  }
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Public Hi-Lo true count computed solely from revealed cards since the last shuffle. */
export function trueCountOf(state: TableState): number {
  const decksLeft = Math.max(
    0.5,
    state.deck.length > 0 ? state.deck.length / CARDS_PER_DECK : state.config.deckCount,
  );
  return state.runningCount / decksLeft;
}

export function botMoodFor(state: TableState, playerId: string): BotMood {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return "calm";
  return deriveBotMood(player, state.memory[playerId], state.config.startingTokens);
}

/** Accurate S17 basic strategy for this table's rules. */
export function basicPlay(
  cards: Card[],
  fromSplit: boolean,
  dealerUpValue: number,
  actions: ActionType[],
): ActionType {
  const { total, soft } = handValue(cards);
  const up = dealerUpValue;
  const pair = !fromSplit && cards.length === 2 && cards[0]!.rank === cards[1]!.rank;
  const rank = cards[0]?.rank;

  if (pair && actions.includes("split") && rank !== undefined) {
    if (rank === 1 || rank === 8) return "split";
    if (rank === 9 && up !== 7 && up !== 10 && up !== 11) return "split";
    if (rank === 7 && up <= 7) return "split";
    if (rank === 6 && up >= 2 && up <= 6) return "split";
    if (rank === 4 && (up === 5 || up === 6)) return "split";
    if ((rank === 2 || rank === 3) && up >= 2 && up <= 7) return "split";
  }

  if (actions.includes("surrender")) {
    if (!soft && total === 16 && up >= 9) return "surrender";
    if (!soft && total === 15 && up === 10) return "surrender";
  }

  if (soft) {
    if (total >= 19) return "stand";
    if (total === 18) {
      if (actions.includes("double") && up >= 3 && up <= 6) return "double";
      if (up >= 9) return "hit";
      return "stand";
    }
    if (total === 17) {
      if (actions.includes("double") && up >= 3 && up <= 6) return "double";
      return "hit";
    }
    if (actions.includes("double") && up >= 5 && up <= 6) return "double";
    if (actions.includes("double") && total >= 15 && up === 4) return "double";
    return "hit";
  }

  if (total >= 17) return "stand";
  if (total >= 13 && total <= 16) return up >= 2 && up <= 6 ? "stand" : "hit";
  if (total === 12) return up >= 4 && up <= 6 ? "stand" : "hit";
  if (total === 11) {
    if (actions.includes("double") && up !== 11) return "double";
    return "hit";
  }
  if (total === 10) {
    if (actions.includes("double") && up <= 9) return "double";
    return "hit";
  }
  if (total === 9) {
    if (actions.includes("double") && up >= 3 && up <= 6) return "double";
    return "hit";
  }
  return actions.includes("hit") ? "hit" : "stand";
}

/** Illustrious-18 inspired public count deviations, scaled by persona's countSkill. */
function applyCountDeviation(
  action: ActionType,
  style: PlayStyle,
  cards: Card[],
  up: number,
  actions: ActionType[],
  rawTrueCount: number,
): ActionType {
  if (style.countSkill < 0.35 || Math.abs(rawTrueCount) < 0.5) return action;
  // Slightly imperfect perception for mid-skill counters, razor-sharp for Seth/Linus.
  const noise = (Math.random() * 2 - 1) * (1 - style.countSkill) * 0.9;
  const tc = rawTrueCount + noise;
  const { total, soft } = handValue(cards);
  if (soft) return action;

  if (total === 16 && up === 10) {
    if (tc >= 0.4 && action === "hit" && actions.includes("stand")) return "stand";
    if (tc >= 1.2 && action === "surrender" && style.shove > 0.3 && actions.includes("stand")) {
      return "stand";
    }
  }
  if (total === 15 && up === 10) {
    if (tc >= 3.8 && actions.includes("stand")) return "stand";
    if (tc >= 0.2 && actions.includes("surrender")) return "surrender";
  }
  if (total === 12 && up === 3 && tc >= 2.0 && actions.includes("stand")) return "stand";
  if (total === 12 && up === 2 && tc >= 3.2 && actions.includes("stand")) return "stand";
  if (total === 12 && up === 4 && tc <= -0.6 && actions.includes("hit")) return "hit";
  if (total === 13 && up === 2 && tc <= -1.2 && actions.includes("hit")) return "hit";
  if (total === 10 && up === 10 && tc >= 3.8 && actions.includes("double")) return "double";
  if (total === 11 && up === 11 && tc >= 1.2 && actions.includes("double")) return "double";
  if (total === 9 && up === 2 && tc >= 1.2 && actions.includes("double")) return "double";
  if (total === 9 && up === 7 && tc >= 3.0 && actions.includes("double")) return "double";

  return action;
}

/** Psychologically authentic human deviations — strictly confined to realistic borderline spots. */
function deviate(
  style: PlayStyle,
  action: ActionType,
  cards: Card[],
  fromSplit: boolean,
  up: number,
  actions: ActionType[],
  mem: PlayerMemory | undefined,
  mood: BotMood,
): ActionType {
  const { total, soft } = handValue(cards);
  const conf = mem?.confidence ?? 0;
  const wobble = (Math.random() * 2 - 1) * style.mood;
  const pair = !fromSplit && cards.length === 2 && cards[0]!.rank === cards[1]!.rank;
  const rank = cards[0]?.rank;

  // Never mess up obvious high hands or obvious low hits.
  if (!soft && total >= 17) return "stand";
  if (soft && total >= 19) return "stand";
  if (!soft && total <= 8) return actions.includes("hit") ? "hit" : "stand";

  // 1. Multi-card 16 vs 10 (composition-dependent human instinct: "small cards already out").
  if (!soft && total === 16 && up === 10 && cards.length >= 3 && action === "hit" && actions.includes("stand")) {
    const standProb = 0.28 + style.scratch * 0.8 + (mood === "cautious" ? 0.15 : 0);
    if (Math.random() < standProb) return "stand";
  }

  // 2. Painful stiff hands (15–16 vs 7–A): fear of busting vs refusal to surrender.
  if (!soft && (total === 15 || total === 16) && up >= 7) {
    if (action === "surrender") {
      const fightChance = style.shove * 0.45 + (mood === "tilted" ? 0.22 : mood === "bold" ? 0.12 : 0);
      if (Math.random() < fightChance) {
        return actions.includes("hit") ? "hit" : "stand";
      }
    }
    if (action === "hit" && actions.includes("stand")) {
      const fearStand =
        style.scratch * 0.72 +
        (mood === "cautious" ? 0.14 : 0) -
        (mood === "tilted" ? 0.12 : 0) +
        wobble;
      if (Math.random() < fearStand) return "stand";
      if (
        actions.includes("surrender") &&
        total === 15 &&
        up === 9 &&
        Math.random() < style.scratch * 0.45
      ) {
        return "surrender";
      }
    }
  }

  // 3. Borderline stiffs (12 vs 2–3, or 12–13 vs 4–6): timid players freeze on 12; aggressive players get impatient.
  if (!soft && total === 12 && (up === 2 || up === 3) && action === "hit" && actions.includes("stand")) {
    const timidStand = style.scratch * 0.9 + (conf < -0.2 ? 0.12 : 0) + wobble;
    if (Math.random() < timidStand) return "stand";
  }
  if (!soft && (total === 12 || total === 13) && up >= 4 && up <= 6 && action === "stand" && actions.includes("hit")) {
    const restlessHit =
      (style.shove * 0.12 + (mood === "tilted" ? 0.14 : 0) + wobble) * (1 - style.countSkill * 0.65);
    if (Math.random() < restlessHit) return "hit";
  }

  // 4. Soft 18 vs 9/10/A: real humans frequently feel "18 is safe enough" and stand.
  if (soft && total === 18 && up >= 9 && action === "hit" && actions.includes("stand")) {
    const keep18 =
      style.scratch * 0.75 + (1 - style.countSkill) * 0.22 + (mood === "cautious" ? 0.12 : 0);
    if (Math.random() < keep18) return "stand";
  }

  // 5. Borderline legitimate doubles (NEVER doubling stiff 12–16 or hard <= 8!).
  if (action === "double" && soft && total <= 18) {
    // Cautious players sometimes skip soft doubles to avoid risking extra chips.
    const skipDouble = style.scratch * 0.85 + (mood === "cautious" ? 0.18 : 0);
    if (Math.random() < skipDouble) {
      return total === 18 ? "stand" : "hit";
    }
  }
  if (action === "hit" && actions.includes("double")) {
    const borderlineHardDouble =
      !soft &&
      ((total === 9 && (up === 2 || up === 7)) ||
        (total === 10 && up === 10) ||
        (total === 11 && up === 11));
    const borderlineSoftDouble = soft && total >= 13 && total <= 17 && up >= 3 && up <= 6;
    if (borderlineHardDouble || borderlineSoftDouble) {
      const pressDouble =
        style.shove * 0.34 +
        (mood === "hot" ? 0.16 : mood === "bold" ? 0.12 : mood === "tilted" ? 0.1 : 0) +
        wobble;
      if (Math.random() < pressDouble) return "double";
    }
  }

  // 6. Borderline pair splits (never split 10s or 5s).
  if (pair && actions.includes("split") && rank !== undefined && rank !== 10 && rank < 10 && rank !== 5) {
    if (action === "split" && rank === 8 && up >= 10) {
      // Timid players occasionally dread putting double money into 8-8 vs 10/A.
      if (Math.random() < style.scratch * 0.55) {
        if (actions.includes("surrender") && up === 10) return "surrender";
        return "hit";
      }
    }
    if (action !== "split") {
      const cheekySplit =
        (rank === 9 && up === 7) ||
        (rank === 6 && up === 7) ||
        (rank === 4 && up === 4) ||
        (rank === 7 && up === 8);
      if (cheekySplit && Math.random() < style.shove * 0.25 + (mood === "hot" ? 0.1 : 0)) {
        return "split";
      }
    }
  }

  return action;
}

function pickBet(state: TableState, player: Player, style: PlayStyle): PlayerAction {
  const range = computeBetRange(state);
  if (!range) return { type: "bet", amount: state.config.minBet };
  if (range.locked) return { type: "bet", amount: range.min };

  const step = state.config.minBet;
  const mem = state.memory[player.id];
  const mood = deriveBotMood(player, mem, state.config.startingTokens);
  const tc = trueCountOf(state);
  const perceivedTC = tc * style.countSkill;
  const lastBet = state.lastBets[player.id] ?? null;
  const roundsLeft = Math.max(1, state.config.roundsUntilSettle - state.dealsThisHand);
  const sessionStart = state.tokensAtHandStart[player.id] ?? state.config.startingTokens;
  const netProfit = player.tokens - sessionStart;

  // Human habit: casually repeat the previous wager when mood & count are steady.
  const steadySpot =
    lastBet != null &&
    lastBet >= range.min &&
    lastBet <= range.max &&
    Math.abs(perceivedTC) < 1.3 &&
    Math.abs(mem?.streak ?? 0) <= 1 &&
    roundsLeft > 2;
  if (steadySpot && Math.random() < style.repeatHabit) {
    // Occasionally bump or trim by one step so repeats don't look frozen.
    let amount = lastBet;
    const drift = Math.random();
    if (drift < 0.14) amount += step;
    else if (drift < 0.26) amount -= step;
    return { type: "bet", amount: clampBet(amount, range.min, range.max, step) };
  }

  // Base sizing from persona personality.
  let t = 0.08 + style.sizeBias * 0.78;

  // 1. Public true-count spread (only bots with countSkill react meaningfully).
  if (perceivedTC >= 1.0) {
    t += Math.min(0.45, (perceivedTC - 0.7) * 0.14 * style.countSkill);
  } else if (perceivedTC <= -1.0) {
    t -= Math.min(0.32, Math.abs(perceivedTC + 0.7) * 0.12 * style.countSkill);
  }

  // 2. Streak & emotional momentum.
  const streak = mem?.streak ?? 0;
  if (streak >= 2) {
    t += Math.min(0.32, (streak - 1) * 0.11 * style.streakDrive);
  } else if (streak <= -2) {
    if (style.tiltProne >= 0.45 && Math.random() < style.tiltProne * 0.65) {
      // Tilted revenge bet!
      t += 0.14 + Math.random() * 0.18;
    } else {
      // Cool off & protect stack.
      t -= Math.min(0.26, Math.abs(streak + 1) * 0.1 * (1 - style.tiltProne * 0.5));
    }
  } else if (mem?.lastOutcome === "blackjack") {
    t += 0.09 * style.streakDrive;
  } else if (mem?.lastOutcome === "bust" && style.scratch > 0.18) {
    t -= 0.08;
  }

  // 3. Late-session dynamics (rounds 10–12).
  if (roundsLeft <= 3) {
    if (style.archetype === "veteran" && (perceivedTC >= 0.8 || netProfit < 0)) {
      // Veteran closer gear: quietly raises stakes in the final hands when an edge or opening appears.
      t += 0.14;
    } else if (netProfit < -step * 3 && (style.shove >= 0.4 || style.tiltProne >= 0.4)) {
      t += 0.15;
    } else if (netProfit > step * 8 && (style.scratch >= 0.18 || style.archetype === "sharp")) {
      t -= 0.12;
    }
  }

  // 4. Short-stack preservation.
  if (player.tokens < state.config.startingTokens * 0.35) {
    t *= 0.65;
  }

  // 5. Natural variance so two identical spots aren't identical bets.
  t += (Math.random() - 0.5) * (0.18 + style.mood * 1.4);
  t = Math.max(0, Math.min(1, t));

  // Blend classic clean chip ladder (1K/2K/5K/10K) with occasional custom steps (3K/4K/6K/8K).
  const chips = betChipAmounts(range.min, range.max, step);
  if (chips.length === 0) return { type: "bet", amount: range.min };

  const rawAmount = range.min + t * (range.max - range.min);
  const snappedCustom = clampBet(rawAmount, range.min, range.max, step);

  if (mood === "hot" && Math.random() < style.shove * 0.24) {
    return { type: "bet", amount: chips[chips.length - 1]! };
  }

  // 65% stick to clean chip denominations, 35% use human intermediate amounts (e.g. 3K, 4K, 6K, 8K).
  if (Math.random() < 0.65) {
    let best = chips[0]!;
    let bestDist = Math.abs(best - snappedCustom);
    for (const c of chips) {
      const d = Math.abs(c - snappedCustom);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return { type: "bet", amount: best };
  }
  return { type: "bet", amount: snappedCustom };
}

export function chooseBotAction(state: TableState): PlayerAction {
  const player = currentPlayer(state);
  if (!player) return { type: "stand" };
  const style = styleForPersona(player.personaId);
  if (state.phase === "betting") return pickBet(state, player, style);

  const actions = legalActions(state);
  const hand = currentHand(state);
  if (!hand || actions.length === 0) return { type: "stand" };
  if (isBlackjack(hand.cards, hand.fromSplit)) return { type: "stand" };

  const up = dealerUp(state);
  const mem = state.memory[player.id];
  const mood = deriveBotMood(player, mem, state.config.startingTokens);
  let action = basicPlay(hand.cards, hand.fromSplit, up, actions);
  if (!actions.includes(action)) {
    action = actions.includes("stand") ? "stand" : (actions[0] ?? "stand");
  }

  action = applyCountDeviation(action, style, hand.cards, up, actions, trueCountOf(state));
  action = deviate(style, action, hand.cards, hand.fromSplit, up, actions, mem, mood);

  if (!actions.includes(action)) {
    action = actions.includes("stand")
      ? "stand"
      : actions.includes("hit") && canHit(hand)
        ? "hit"
        : actions[0]!;
  }
  if (action === "bet") return { type: "stand" };
  return { type: action };
}

export interface SpotAnalysis {
  total: number;
  soft: boolean;
  stiff: boolean;
  dealerUp: number;
  pair: boolean;
  pace: BotPace;
}

export function evaluateSpot(state: TableState): SpotAnalysis | null {
  const player = currentPlayer(state);
  const style = styleForPersona(player?.personaId);
  const up = dealerUp(state);

  if (state.phase === "betting") {
    const mem = player ? state.memory[player.id] : undefined;
    const tc = Math.abs(trueCountOf(state) * style.countSkill);
    const roundsLeft = state.config.roundsUntilSettle - state.dealsThisHand;
    const highStakes = Math.abs(mem?.streak ?? 0) >= 2 || tc >= 1.5 || roundsLeft <= 2;
    return {
      total: 0,
      soft: false,
      stiff: false,
      dealerUp: 0,
      pair: false,
      pace: highStakes ? "deliberate" : "normal",
    };
  }

  const hand = currentHand(state);
  if (!hand || hand.cards.length === 0) return null;
  const { total, soft } = handValue(hand.cards);
  const actions = legalActions(state);
  const pair = !hand.fromSplit && hand.cards.length === 2 && hand.cards[0]!.rank === hand.cards[1]!.rank;
  const stiff = !soft && total >= 12 && total <= 16;

  // Classify cognitive difficulty of this exact decision.
  let pace: BotPace = "normal";
  if (
    (!soft && (total === 15 || total === 16) && up >= 7) ||
    (pair && hand.cards[0]!.rank === 8 && up >= 10 && actions.includes("split")) ||
    (!soft && total === 12 && (up === 2 || up === 3) && style.scratch >= 0.16)
  ) {
    pace = "tank";
  } else if (
    (pair && actions.includes("split") && hand.cards[0]!.rank !== 10 && hand.cards[0]!.rank < 10) ||
    (actions.includes("double") && ((!soft && total >= 9 && total <= 11) || (soft && total >= 13 && total <= 18 && up <= 6))) ||
    (soft && total === 18 && up >= 9) ||
    stiff
  ) {
    pace = "deliberate";
  } else if (
    (!soft && total >= 19) ||
    (soft && total >= 19) ||
    (!soft && total <= 8 && !pair)
  ) {
    pace = "snap";
  }

  return { total, soft, stiff, dealerUp: up, pair, pace };
}

/**
 * Natural human-paced thinking duration:
 * - snap (obvious 20 stand, <= 8 hit): ~1.1s–2.1s
 * - normal (routine bet / 17-18 / simple hit): ~1.7s–3.2s
 * - deliberate (double / split / soft 18 / streak bet): ~2.5s–4.6s
 * - tank (painful 15-16 vs 10/A, tough surrender/split): ~3.7s–7.8s (within 3.6s–12s)
 */
export function botThinkMs(state: TableState): number {
  const player = currentPlayer(state);
  const style = styleForPersona(player?.personaId);
  const spot = evaluateSpot(state);
  const pace: BotPace = spot?.pace ?? "normal";

  // Persona tempo factor: cautious/methodical players take slightly longer; aggressive players act brisker.
  const tempo = Math.max(0.82, Math.min(1.22, (style.thinkMin + style.thinkMax) / 13_600));
  const triangular = (Math.random() + Math.random()) / 2;

  if (pace === "snap") {
    const ms = (1_050 + triangular * 900) * tempo;
    return Math.round(Math.min(2_300, Math.max(950, ms)));
  }
  if (pace === "normal") {
    const base = state.phase === "betting" ? 1_450 : 1_650;
    const ms = (base + triangular * 1_450) * tempo;
    return Math.round(Math.min(3_600, Math.max(1_250, ms)));
  }
  if (pace === "deliberate") {
    const ms = (2_350 + triangular * 1_950) * tempo;
    return Math.round(Math.min(5_200, Math.max(2_100, ms)));
  }

  // "tank" — genuine sweat spots (e.g. hard 16 vs dealer 10) always take 3.6s–12s so the table feels the tension.
  const extraSweat = Math.random() < 0.22 ? 600 + Math.random() * 1_400 : 0;
  const ms = (3_800 + triangular * 3_200) * tempo + extraSweat;
  return Math.round(Math.min(12_000, Math.max(3_600, ms)));
}

/** Generate context-accurate thinking bubble lines matched to the bot's actual spot & persona. */
export function botThoughtFor(state: TableState, playerId: string, plannedThinkMs?: number): BotCue {
  const player = state.players.find((p) => p.id === playerId) ?? currentPlayer(state);
  const style = styleForPersona(player?.personaId);
  const voice = style.voice;
  const mem = player ? state.memory[player.id] : undefined;
  const mood = player ? deriveBotMood(player, mem, state.config.startingTokens) : "calm";
  const spot = evaluateSpot(state);
  const pace: BotPace = spot?.pace ?? "normal";
  const thinkMs = plannedThinkMs ?? botThinkMs(state);

  if (state.phase === "betting") {
    const tc = trueCountOf(state);
    const roundsLeft = state.config.roundsUntilSettle - state.dealsThisHand;
    let pool = voice.betCalm;
    if (roundsLeft <= 2) pool = voice.betLate;
    else if (style.countSkill >= 0.5 && tc >= 1.5) pool = voice.betRich;
    else if ((mem?.streak ?? 0) >= 2 || mood === "hot") pool = voice.betHot;
    else if ((mem?.streak ?? 0) <= -2 || mem?.lastOutcome === "bust") pool = voice.betCold;

    const first = pickFrom(pool);
    const lines = [first];
    if (pace === "deliberate" && pool.length > 1) {
      const second = pool.find((l) => l !== first);
      if (second) lines.push(second);
    }
    return {
      playerId: player?.id ?? playerId,
      phase: "betting",
      pace,
      mood,
      lines,
      thinkMs,
    };
  }

  const hand = currentHand(state);
  const actions = legalActions(state);
  const dealerCard = state.dealer[0];
  const up = dealerUp(state);
  const { total, soft } = hand ? handValue(hand.cards) : { total: 0, soft: false };
  const pair = Boolean(
    hand && !hand.fromSplit && hand.cards.length === 2 && hand.cards[0]!.rank === hand.cards[1]!.rank,
  );
  const dealerText = dealerCard ? rankLabel(dealerCard.rank) : "10";

  let lines: string[];

  if (pace === "snap") {
    if (!soft && total <= 8) {
      lines = [pickFrom(voice.playLow)];
    } else {
      lines = [pickFrom(voice.playStrong)];
    }
  } else if (pace === "tank") {
    const specificOpening =
      Math.random() < 0.45 && !soft && total >= 12 && total <= 16
        ? `${total} 对 ${dealerText}…`
        : pickFrom(voice.playStiffHard);
    const pivot = pickFrom(voice.playStiffPivot);
    lines = [specificOpening, pivot];
  } else if (pair && actions.includes("split") && hand!.cards[0]!.rank < 10) {
    lines = [pickFrom(voice.playSplitSpot)];
  } else if (
    actions.includes("double") &&
    ((!soft && total >= 9 && total <= 11) || (soft && total >= 13 && total <= 18 && up <= 6))
  ) {
    lines = [pickFrom(voice.playDoubleSpot)];
  } else if (soft) {
    lines = [pickFrom(voice.playSoft)];
  } else if (!soft && total >= 12 && total <= 16 && up >= 2 && up <= 6) {
    lines = [pickFrom(voice.playDealerWeak)];
  } else if (!soft && total >= 17) {
    lines = [pickFrom(voice.playStrong)];
  } else {
    lines = [pickFrom(voice.playLow)];
  }

  return {
    playerId: player?.id ?? playerId,
    phase: "awaiting",
    pace,
    mood,
    lines,
    thinkMs,
  };
}

/** Optional lively micro-reaction right after a bot makes a dramatic mid-turn action. */
export function botActionReaction(
  before: TableState,
  after: TableState,
  playerId: string,
  action: PlayerAction,
  seqId: number,
): BotReaction | null {
  if (action.type === "bet" || action.type === "stand") return null;
  const player = after.players.find((p) => p.id === playerId);
  if (!player || player.kind !== "bot") return null;
  const style = styleForPersona(player.personaId);
  const voice = style.voice;
  const hand = after.lastCards[playerId]?.hands[before.currentHandIndex];

  if (action.type === "double") {
    if (hand && isBust(hand.cards)) {
      return { id: seqId, playerId, text: pickFrom(voice.reactBust), tone: "negative" };
    }
    if (Math.random() < 0.65 + style.chattiness * 0.25) {
      return { id: seqId, playerId, text: pickFrom(voice.reactDouble), tone: "bold" };
    }
    return null;
  }

  if (action.type === "split") {
    if (Math.random() < 0.65 + style.chattiness * 0.25) {
      return { id: seqId, playerId, text: pickFrom(voice.reactSplit), tone: "bold" };
    }
    return null;
  }

  if (action.type === "surrender") {
    if (Math.random() < 0.5 + style.chattiness * 0.3) {
      return { id: seqId, playerId, text: pickFrom(voice.reactSurrender), tone: "neutral" };
    }
    return null;
  }

  if (action.type === "hit" && hand) {
    const val = handValue(hand.cards).total;
    if (val > 21) {
      if (Math.random() < 0.55 + style.chattiness * 0.35) {
        return { id: seqId, playerId, text: pickFrom(voice.reactBust), tone: "negative" };
      }
      return null;
    }
    if (val === 21) {
      return { id: seqId, playerId, text: pickFrom(voice.reactHit21), tone: "positive" };
    }
  }

  return null;
}

/**
 * Deterministic, restrained reveal-stage reactions (1–2 bots max) shown ONLY at the reveal "result" beat
 * so they never spoil the dealer's hole card before the flip.
 */
export function botRevealReactions(state: PublicState): BotReaction[] {
  if (state.phase !== "reveal") return [];
  const seedBase = state.handNumber * 97 + state.dealsThisHand * 31;
  const dealerBust = state.dealer.bust;

  interface Candidate {
    priority: number;
    reaction: BotReaction;
  }

  const candidates: Candidate[] = [];
  state.players.forEach((player, idx) => {
    if (player.kind !== "bot" || !player.cards?.hands.length) return;
    const style = styleForPersona(player.personaId);
    const voice = style.voice;
    const seed = seedBase + idx * 17;

    let bestPriority = 0;
    let chosen: BotReaction | null = null;

    for (const hand of player.cards.hands) {
      const out = hand.outcome;
      if (!out) continue;
      const total = handValue(hand.cards).total;

      if (out.kind === "blackjack" && 100 > bestPriority) {
        bestPriority = 100;
        chosen = {
          id: seed * 10 + 1,
          playerId: player.id,
          text: pickFrom(voice.reactBlackjack, seed),
          tone: "bold",
        };
      } else if (out.kind === "lose" && total >= 19 && total <= 20 && 85 > bestPriority) {
        bestPriority = 85;
        chosen = {
          id: seed * 10 + 2,
          playerId: player.id,
          text: pickFrom(voice.reactBadBeat, seed),
          tone: "negative",
        };
      } else if (out.kind === "win" && dealerBust && 72 > bestPriority) {
        bestPriority = 72 + style.chattiness * 10;
        chosen = {
          id: seed * 10 + 3,
          playerId: player.id,
          text: pickFrom(voice.reactDealerBust, seed),
          tone: "positive",
        };
      } else if (out.kind === "win" && out.wager >= state.config.minBet * 4 && 68 > bestPriority) {
        bestPriority = 68 + style.chattiness * 10;
        chosen = {
          id: seed * 10 + 4,
          playerId: player.id,
          text: pickFrom(voice.reactWin, seed),
          tone: "positive",
        };
      } else if (out.kind === "win" && ((seed % 10) / 10) < style.chattiness * 0.7 && 45 > bestPriority) {
        bestPriority = 45 + style.chattiness * 10;
        chosen = {
          id: seed * 10 + 5,
          playerId: player.id,
          text: pickFrom(voice.reactWin, seed),
          tone: "positive",
        };
      }
    }

    if (chosen && bestPriority > 0) {
      candidates.push({ priority: bestPriority, reaction: chosen });
    }
  });

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2)
    .map((c) => c.reaction);
}
