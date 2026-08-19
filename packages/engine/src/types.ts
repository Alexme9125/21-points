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
  /** Paid ante this hand and still has chips to be dealt. */
  inHand: boolean;
}

export interface TableConfig {
  startingTokens: number;
  ante: number;
  minAdd: number;
  maxAdd: number;
  maxLoss: number;
  seatCount: number;
  dealsUntilSplit: number;
}

export const DEFAULT_CONFIG: TableConfig = {
  startingTokens: 500_000,
  ante: 50_000,
  minAdd: 5_000,
  maxAdd: 100_000,
  maxLoss: 200_000,
  seatCount: 4,
  dealsUntilSplit: 40,
};

export const POOL_NAME = "许愿池";

export type Phase = "idle" | "awaiting" | "reveal" | "settlement" | "gameover";

export type HoleKind = "consecutive" | "pair" | "spread";

export type OutcomeKind =
  | "consecutive"
  | "fold"
  | "win"
  | "lose"
  | "horn"
  | "triple_win"
  | "triple_lose";

export interface RevealOutcome {
  kind: OutcomeKind;
  amount: number;
  multiplier?: number;
  third?: Card;
}

export type LogKind =
  | "ante"
  | "deal"
  | "shuffle"
  | "consecutive"
  | "fold"
  | "add"
  | "win"
  | "lose"
  | "horn"
  | "triple_win"
  | "triple_lose"
  | "pool_empty"
  | "split"
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

export interface HoleHint {
  kind: HoleKind;
  winRanks: Rank[];
  hornRanks: Rank[];
  loseRanks: Rank[];
}

export interface SeatCards {
  hole: [Card, Card];
  third?: Card;
  outcome?: RevealOutcome;
}

export interface Settlement {
  reason: "empty" | "split" | "gameover";
  deltas: Record<string, number>;
  leftoverPool: number;
  splitEach?: number;
}

export interface TableState {
  config: TableConfig;
  players: Player[];
  phase: Phase;
  rng: number;
  deck: Card[];
  projectPool: number;
  firstActorIndex: number;
  currentIndex: number;
  orbitDeals: number;
  dealsThisHand: number;
  handNumber: number;
  hole: [Card, Card] | null;
  third: Card | null;
  outcome: RevealOutcome | null;
  logs: LogEntry[];
  logSeq: number;
  lastCards: Record<string, SeatCards>;
  tokensAtHandStart: Record<string, number>;
  settlement: Settlement | null;
}

export type PlayerAction = { type: "fold" } | { type: "add"; amount: number };

export interface PublicPlayer {
  id: string;
  name: string;
  kind: PlayerKind;
  personaId?: string;
  tokens: number;
  inHand: boolean;
  cards?: SeatCards;
}

export interface PublicState {
  phase: Phase;
  config: TableConfig;
  players: PublicPlayer[];
  projectPool: number;
  currentIndex: number;
  currentPlayerId: string | null;
  firstActorIndex: number;
  orbitDeals: number;
  dealsThisHand: number;
  handNumber: number;
  hole: [Card, Card] | null;
  third: Card | null;
  outcome: RevealOutcome | null;
  hint: HoleHint | null;
  betRange: BetRange | null;
  logs: LogEntry[];
  settlement: Settlement | null;
}
