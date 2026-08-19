import { formatTokens, type PublicPlayer } from "@hotpot/engine";
import { Avatar } from "./Avatar";
import { CardView } from "./CardView";

export function SeatCapsule({
  player,
  you,
  active,
  thinking,
  place,
}: {
  player: PublicPlayer;
  you: boolean;
  active: boolean;
  thinking: boolean;
  place: "bottom" | "top" | "left" | "right";
}) {
  const cards = player.cards;
  const showCards = Boolean(cards && (you || active || cards.outcome));
  return (
    <div className={`seat seat-${place} ${active ? "active" : ""} ${you ? "you" : ""}`}>
      {showCards && cards ? (
        <div className="seat-cards">
          <CardView card={cards.hole[0]} tilt={-8} compact />
          <CardView card={cards.hole[1]} tilt={8} compact />
        </div>
      ) : null}
      <div className="capsule">
        <Avatar name={player.name} personaId={player.personaId} you={you} />
        <div className="capsule-meta">
          <div className="capsule-name">
            {you ? "You" : player.name}
            {!player.inHand ? <span className="tag">旁观</span> : null}
          </div>
          <div className="capsule-tokens">{formatTokens(player.tokens)} Tokens</div>
        </div>
      </div>
      {thinking ? (
        <div className="think">
          <i />
          <span>思考中</span>
        </div>
      ) : null}
    </div>
  );
}
