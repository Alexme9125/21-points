import { isRed, rankLabel, type Card } from "@hotpot/engine";

export function SuitIcon({ suit, className = "suit" }: { suit: Card["suit"]; className?: string }) {
  if (suit === "clubs") {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <circle cx="16" cy="9.6" r="5.2" fill="currentColor" />
        <circle cx="10.2" cy="17.6" r="5.2" fill="currentColor" />
        <circle cx="21.8" cy="17.6" r="5.2" fill="currentColor" />
        <path
          d="M12.5 14 H19.5 L17.2 21 C17.5 24.6 18.6 27.3 20.5 29.2 H11.5 C13.4 27.3 14.5 24.6 14.8 21 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  const d =
    suit === "spades"
      ? "M16 2.6 C12 8.4 5.4 13.1 5.4 18.8 A5.6 5.6 0 0 0 14.9 22.8 C14.7 25.4 13.6 27.5 11.6 29.2 H20.4 C18.4 27.5 17.3 25.4 17.1 22.8 A5.6 5.6 0 0 0 26.6 18.8 C26.6 13.1 20 8.4 16 2.6 Z"
      : suit === "hearts"
        ? "M16 29 C16 29 4.5 21 4.5 12.2 A6.1 6.1 0 0 1 16 8.9 A6.1 6.1 0 0 1 27.5 12.2 C27.5 21 16 29 16 29 Z"
        : "M16 2.6 Q19.4 11.6 27.4 16 Q19.4 20.4 16 29.4 Q12.6 20.4 4.6 16 Q12.6 11.6 16 2.6 Z";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function CardBackPattern() {
  return (
    <svg className="card-back-svg" viewBox="0 0 76 108" aria-hidden="true">
      <rect x="4.5" y="4.5" width="67" height="99" rx="7" fill="none" stroke="rgba(252,251,247,0.38)" strokeWidth="1" />
      <rect x="8" y="8" width="60" height="92" rx="4.5" fill="none" stroke="rgba(252,251,247,0.16)" strokeWidth="0.75" />
      <path
        d="M38 22 L54 54 L38 86 L22 54 Z M38 32 L47 54 L38 76 L29 54 Z"
        fill="none"
        stroke="rgba(252,251,247,0.28)"
        strokeWidth="1"
      />
      <circle cx="38" cy="54" r="3.4" fill="rgba(252,251,247,0.75)" />
      <circle cx="38" cy="22" r="1.6" fill="rgba(252,251,247,0.45)" />
      <circle cx="38" cy="86" r="1.6" fill="rgba(252,251,247,0.45)" />
    </svg>
  );
}

export function CardView({
  card,
  tilt = 0,
  compact = false,
  draw = false,
  flip = false,
  delayMs = 0,
  faceDown = false,
}: {
  card?: Card;
  tilt?: number;
  compact?: boolean;
  draw?: boolean;
  flip?: boolean;
  delayMs?: number;
  faceDown?: boolean;
}) {
  const isFaceDown = faceDown || !card;
  const isRoyal = Boolean(card && (card.rank === 1 || card.rank >= 11));
  const className = [
    "playing-card",
    compact ? "compact" : "",
    draw ? "draw" : "",
    flip ? "flip-in" : "",
    isFaceDown ? "back" : isRed(card.suit) ? "red" : "black",
    !isFaceDown && isRoyal ? "royal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{ ["--tilt" as string]: `${tilt}deg`, ["--draw-delay" as string]: `${delayMs}ms` }}
    >
      {isFaceDown ? (
        <CardBackPattern />
      ) : (
        <>
          <div className="corner top-corner">
            <b>{rankLabel(card.rank)}</b>
            <SuitIcon suit={card.suit} />
          </div>
          <div className="center-suit">
            {isRoyal && !compact ? <span className="royal-frame" aria-hidden="true" /> : null}
            <SuitIcon suit={card.suit} />
          </div>
          {!compact ? (
            <div className="corner bottom-corner" aria-hidden="true">
              <b>{rankLabel(card.rank)}</b>
              <SuitIcon suit={card.suit} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
