import { cardKey, isRed, rankLabel, type Card } from "@hotpot/engine";

function SuitIcon({ suit }: { suit: Card["suit"] }) {
  const d =
    suit === "spades"
      ? "M16 3 C12 10 6 14 6 20 A6 6 0 0 0 16 22 A6 6 0 0 0 26 20 C26 14 20 10 16 3 M16 22 L13 29 H19 Z"
      : suit === "hearts"
        ? "M16 28 C8 20 4 15 4 11 A6 6 0 0 1 16 10 A6 6 0 0 1 28 11 C28 15 24 20 16 28"
        : suit === "diamonds"
          ? "M16 3 L28 16 L16 29 L4 16 Z"
          : "M16 4 C10 10 7 13 7 18 A5.5 5.5 0 0 0 16 21 A5.5 5.5 0 0 0 25 18 C25 13 22 10 16 4 M10 16 H22 C18 22 16 26 16 29 C16 26 14 22 10 16";
  return (
    <svg viewBox="0 0 32 32" className="suit">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

export function CardView({
  card,
  tilt = 0,
  compact,
  draw = false,
  delayMs = 0,
}: {
  card: Card;
  tilt?: number;
  compact?: boolean;
  draw?: boolean;
  delayMs?: number;
}) {
  const red = isRed(card.suit);
  return (
    <div
      key={cardKey(card)}
      className={`playing-card ${red ? "red" : "black"} ${compact ? "compact" : ""} ${draw ? "draw" : ""}`}
      style={{ ["--tilt" as string]: `${tilt}deg`, ["--draw-delay" as string]: `${delayMs}ms` }}
    >
      <div className="corner">
        <b>{rankLabel(card.rank)}</b>
        <SuitIcon suit={card.suit} />
      </div>
      <div className="center-suit">
        <SuitIcon suit={card.suit} />
      </div>
    </div>
  );
}
