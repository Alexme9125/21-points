import { DEFAULT_THINK_LINES, formatTokens, personaById, type PublicPlayer } from "@hotpot/engine";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { CardView } from "./CardView";

export function SeatCapsule({
  player,
  you,
  active,
  thinking,
  place,
  showCards,
}: {
  player: PublicPlayer;
  you: boolean;
  active: boolean;
  thinking: boolean;
  place: "bottom" | "top" | "left" | "right";
  showCards: boolean;
}) {
  const cards = player.cards;
  const holeKey = cards ? `${cards.hole[0].suit}${cards.hole[0].rank}${cards.hole[1].suit}${cards.hole[1].rank}` : "";
  const lines = personaById(player.personaId ?? "")?.style.thinkLines ?? DEFAULT_THINK_LINES;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!thinking) {
      setTick(0);
      return;
    }
    const t = window.setInterval(() => setTick((n) => n + 1), 1600);
    return () => window.clearInterval(t);
  }, [thinking, player.id]);

  const line = lines[tick % lines.length] ?? lines[0];

  return (
    <div
      className={`seat seat-${place} ${active ? "active" : ""} ${you ? "you" : ""} ${thinking ? "thinking" : ""}`}
      data-player-id={player.id}
    >
      {showCards && cards ? (
        <div className="seat-cards" key={holeKey}>
          <CardView card={cards.hole[0]} tilt={-8} compact draw delayMs={0} />
          <CardView card={cards.hole[1]} tilt={8} compact draw delayMs={90} />
        </div>
      ) : null}
      {thinking ? (
        <div className="think-bubble" aria-live="polite">
          <span className="think-line">{line}</span>
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
      <div className="capsule">
        <Avatar name={player.name} personaId={player.personaId} you={you} />
        <div className="capsule-meta">
          <div className="capsule-name">
            <span className="who" title={player.name}>{you ? "You" : player.name}</span>
            {!player.inHand ? <span className="tag">旁观</span> : null}
          </div>
          <div className="capsule-tokens">{formatTokens(player.tokens)} Tokens</div>
        </div>
      </div>
    </div>
  );
}
