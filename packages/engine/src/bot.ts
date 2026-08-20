import { betChipAmounts } from "./bets.js";
import { styleForPersona, type PlayStyle } from "./personas.js";
import { canHit, handValue, isBlackjack, legalActions, pipValue } from "./rules.js";
import { computeBetRange, currentPlayer } from "./table.js";
import type { ActionType, Card, HandState, PlayerAction, TableState } from "./types.js";

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

/** Basic-strategy-ish play, then persona wobble. */
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

function deviate(style: PlayStyle, action: ActionType, total: number, soft: boolean, actions: ActionType[]): ActionType {
  const wobble = (Math.random() * 2 - 1) * style.mood;
  const stiff = !soft && total >= 12 && total <= 16;
  if (stiff && action === "hit" && actions.includes("stand") && Math.random() < style.scratch + wobble) {
    return "stand";
  }
  if (stiff && action === "stand" && actions.includes("hit") && Math.random() < style.shove * 0.35 + wobble) {
    return "hit";
  }
  if (action === "hit" && actions.includes("double") && Math.random() < style.shove * 0.25) {
    return "double";
  }
  if (action === "surrender" && Math.random() < style.shove * 0.4) {
    return actions.includes("hit") ? "hit" : "stand";
  }
  return action;
}

function pickBet(state: TableState, style: PlayStyle): PlayerAction {
  const range = computeBetRange(state);
  if (!range) return { type: "bet", amount: state.config.minBet };
  const chips = betChipAmounts(range.min, range.max, state.config.minBet);
  if (chips.length === 0) return { type: "bet", amount: range.min };
  const t = Math.max(0, Math.min(1, 0.12 + style.sizeBias * 0.88));
  let idx = Math.round(t * (chips.length - 1));
  if (Math.random() < style.shove * 0.18) idx = chips.length - 1;
  else idx += Math.round((Math.random() * 2 - 1) * 0.7);
  idx = Math.max(0, Math.min(chips.length - 1, idx));
  return { type: "bet", amount: chips[idx]! };
}

export function chooseBotAction(state: TableState): PlayerAction {
  const player = currentPlayer(state);
  if (!player) return { type: "stand" };
  if (state.phase === "betting") return pickBet(state, styleForPersona(player.personaId));

  const actions = legalActions(state);
  const hand = currentHand(state);
  if (!hand || actions.length === 0) return { type: "stand" };

  const style = styleForPersona(player.personaId);
  if (isBlackjack(hand.cards, hand.fromSplit)) return { type: "stand" };

  let action = basicPlay(hand.cards, hand.fromSplit, dealerUp(state), actions);
  if (!actions.includes(action)) {
    action = actions.includes("stand") ? "stand" : (actions[0] ?? "stand");
  }
  const { total, soft } = handValue(hand.cards);
  action = deviate(style, action, total, soft, actions);
  if (!actions.includes(action)) {
    action = actions.includes("stand") ? "stand" : (actions.includes("hit") && canHit(hand) ? "hit" : actions[0]!);
  }
  if (action === "bet") return { type: "stand" };
  return { type: action };
}

export function evaluateSpot(state: TableState): { total: number; soft: boolean; stiff: boolean } | null {
  const hand = currentHand(state);
  if (!hand || hand.cards.length === 0) return null;
  const { total, soft } = handValue(hand.cards);
  return { total, soft, stiff: !soft && total >= 12 && total <= 16 };
}

export function botThinkMs(state: TableState): number {
  const player = currentPlayer(state);
  const style = styleForPersona(player?.personaId);
  const spot = evaluateSpot(state);
  const hesitation = spot?.stiff ? 1 : state.phase === "betting" ? 0.35 : 0.2;
  const triangular = (Math.random() + Math.random()) / 2;
  const span = style.thinkMax - style.thinkMin;
  const extraTank = Math.random() < 0.1 ? 800 + Math.random() * 1800 : 0;
  const snap = !spot?.stiff && Math.random() < 0.18 ? -Math.min(1400, span * 0.22) : 0;
  const ms =
    style.thinkMin +
    span * (0.22 + 0.58 * triangular) +
    hesitation * 1600 +
    extraTank +
    snap +
    Math.random() * 500;
  return Math.round(Math.min(12_000, Math.max(3_600, ms)));
}
