export const RANK_LABELS = [
  "",
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type PlayerKind = "human" | "bot";

export interface Player {
  id: string;
  name: string;
  kind: PlayerKind;
  personaId?: string;
  tokens: number;
  /** Posted a bet this round and still has a hand. */
  inHand: boolean;
}

export interface TableConfig {
  startingTokens: number;
  minBet: number;
  maxBet: number;
  seatCount: number;
  roundsUntilSettle: number;
}

export const DEFAULT_CONFIG: TableConfig = {
  startingTokens: 500_000,
  minBet: 5_000,
  maxBet: 100_000,
  seatCount: 4,
  roundsUntilSettle: 24,
};

export const DEALER_NAME = "庄家";

export type Phase = "idle" | "betting" | "awaiting" | "reveal" | "settlement" | "gameover";

export type HandStatus = "open" | "stood" | "bust" | "blackjack" | "surrender";

export type OutcomeKind = "blackjack" | "win" | "push" | "lose" | "bust" | "surrender";

export type ActionType = "bet" | "hit" | "stand" | "double" | "split" | "surrender";

export interface RevealOutcome {
  kind: OutcomeKind;
  /** Chips returned to the player (0 on a loss). */
  amount: number;
  wager: number;
}

export type LogKind =
  | "bet"
  | "deal"
  | "shuffle"
  | "hit"
  | "stand"
  | "double"
  | "split"
  | "surrender"
  | "bust"
  | "blackjack"
  | "win"
  | "push"
  | "lose"
  | "dealer"
  | "gameover";

export interface LogEntry {
  id: number;
  kind: LogKind;
  playerId?: string;
  name?: string;
  amount?: number;
  text: string;
}

export interface BetRange {
  min: number;
  max: number;
  locked: boolean;
}

export interface HandHint {
  total: number;
  soft: boolean;
  dealerUp: number | null;
  label: string;
}

export interface HandState {
  cards: Card[];
  bet: number;
  status: HandStatus;
  fromSplit: boolean;
  outcome?: RevealOutcome;
}

export interface SeatCards {
  hands: HandState[];
}

export interface Settlement {
  reason: "rounds" | "gameover";
  deltas: Record<string, number>;
}

export interface TableState {
  config: TableConfig;
  players: Player[];
  phase: Phase;
  rng: number;
  deck: Card[];
  dealer: Card[];
  dealerRevealed: boolean;
  pot: number;
  firstActorIndex: number;
  currentIndex: number;
  currentHandIndex: number;
  dealsThisHand: number;
  handNumber: number;
  outcome: RevealOutcome | null;
  logs: LogEntry[];
  logSeq: number;
  lastCards: Record<string, SeatCards>;
  tokensAtHandStart: Record<string, number>;
  settlement: Settlement | null;
}

export type PlayerAction =
  | { type: "bet"; amount: number }
  | { type: "hit" }
  | { type: "stand" }
  | { type: "double" }
  | { type: "split" }
  | { type: "surrender" };

export interface PublicPlayer {
  id: string;
  name: string;
  kind: PlayerKind;
  personaId?: string;
  tokens: number;
  inHand: boolean;
  cards?: SeatCards;
}

export interface PublicDealer {
  cards: Card[];
  hidden: boolean;
  total: number | null;
  bust: boolean;
  blackjack: boolean;
}

export interface PublicState {
  phase: Phase;
  config: TableConfig;
  players: PublicPlayer[];
  dealer: PublicDealer;
  pot: number;
  currentIndex: number;
  currentPlayerId: string | null;
  currentHandIndex: number;
  firstActorIndex: number;
  dealsThisHand: number;
  handNumber: number;
  outcome: RevealOutcome | null;
  hint: HandHint | null;
  betRange: BetRange | null;
  legalActions: ActionType[];
  logs: LogEntry[];
  settlement: Settlement | null;
}
