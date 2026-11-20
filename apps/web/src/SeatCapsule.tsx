import {
  cardKey,
  DEFAULT_THINK_LINES,
  formatTokens,
  handLabel,
  handValue,
  isBlackjack,
  personaById,
  type BotCue,
  type BotReaction,
  type HandState,
  type PublicPlayer,
  type RevealOutcome,
} from "@hotpot/engine";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { CardView } from "./CardView";
import { isTopPlace, type SeatPlace } from "./seats";

function handTone(hand: HandState, showOutcome: boolean): string {
  if (showOutcome && hand.outcome) {
    if (hand.outcome.kind === "blackjack") return "bj";
    if (hand.outcome.kind === "win") return "win";
    if (hand.outcome.kind === "bust" || hand.outcome.kind === "lose") return "bust";
    return "muted";
  }
  if (isBlackjack(hand.cards, hand.fromSplit)) return "bj";
  const { total } = handValue(hand.cards);
  if (total > 21 || hand.status === "bust") return "bust";
  if (total === 21) return "win";
  if (hand.status === "surrender") return "muted";
  return "neutral";
}

function outcomeBadgeText(outcome: RevealOutcome): string {
  const net = outcome.amount - outcome.wager;
  if (outcome.kind === "blackjack") return `黑杰克 +${formatTokens(net)}`;
  if (outcome.kind === "win") return `赢 +${formatTokens(net)}`;
  if (outcome.kind === "push") return "平局";
  if (outcome.kind === "surrender") return `投降 -${formatTokens(outcome.wager - outcome.amount)}`;
  if (outcome.kind === "bust") return "爆牌";
  return `输 -${formatTokens(outcome.wager)}`;
}

export function SeatCapsule({
  player,
  you,
  active,
  activeHandIndex,
  thinking,
  cue,
  reaction,
  showOutcomes,
  place,
  showCards,
  renameable,
  onRename,
}: {
  player: PublicPlayer;
  you: boolean;
  active: boolean;
  activeHandIndex?: number;
  thinking: boolean;
  cue?: BotCue | null;
  reaction?: BotReaction | null;
  showOutcomes?: boolean;
  place: SeatPlace;
  showCards: boolean;
  renameable?: boolean;
  onRename?: (name: string) => void;
}) {
  const cards = player.cards;
  const persona = player.personaId ? personaById(player.personaId) : undefined;
  const fallbackLines = persona?.style.thinkLines ?? DEFAULT_THINK_LINES;
  const cueLines = cue && cue.playerId === player.id && cue.lines.length > 0 ? cue.lines : fallbackLines;
  const cueKey = `${player.id}-${cue?.phase ?? ""}-${cueLines.join("|")}-${cue?.thinkMs ?? 0}`;

  const [beat, setBeat] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const wager = (cards?.hands ?? []).reduce((sum, h) => sum + (h.bet || 0), 0);
  const topSide = isTopPlace(place);
  const streak = player.streak ?? 0;

  useEffect(() => {
    setBeat(0);
    if (!thinking || cueLines.length <= 1) return;
    const switchAt = cue?.thinkMs ? Math.max(1200, Math.round(cue.thinkMs * 0.54)) : 2000;
    const t = window.setTimeout(() => setBeat(1), switchAt);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking, cueKey]);

  useEffect(() => {
    if (!editing) setDraft(player.name);
  }, [player.name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const next = draft.trim().slice(0, 16);
    setEditing(false);
    if (next && next !== player.name) onRename?.(next);
    else setDraft(player.name);
  }

  const thinkLine = cueLines[Math.min(beat, cueLines.length - 1)] ?? cueLines[0];
  const isTanking = Boolean(thinking && cue?.pace === "tank");
  const splitHands = (cards?.hands.length ?? 0) > 1;

  // Overall reveal tone for subtle capsule highlight.
  let seatOutcomeClass = "";
  if (showOutcomes && cards?.hands.length) {
    const net = cards.hands.reduce(
      (sum, h) => sum + ((h.outcome?.amount ?? 0) - (h.outcome?.wager ?? 0)),
      0,
    );
    const hasBj = cards.hands.some((h) => h.outcome?.kind === "blackjack");
    if (hasBj) seatOutcomeClass = "outcome-bj";
    else if (net > 0) seatOutcomeClass = "outcome-win";
    else if (net < 0) seatOutcomeClass = "outcome-lose";
  }

  const handsBlock =
    showCards && cards ? (
      <div className={`seat-hands ${splitHands ? "split-hands" : ""}`}>
        {cards.hands.map((hand, i) => {
          const isActingHand = Boolean(active && splitHands && activeHandIndex === i);
          const tone = handTone(hand, Boolean(showOutcomes));
          const showOut = Boolean(showOutcomes && hand.outcome);
          return (
            <div className={`seat-hand ${isActingHand ? "acting-hand" : ""}`} key={i}>
              <div className="seat-cards">
                {hand.cards.map((card, idx) => (
                  <CardView
                    key={`${cardKey(card)}-${idx}`}
                    card={card}
                    tilt={hand.cards.length === 2 ? (idx === 0 ? -5 : 5) : (idx - (hand.cards.length - 1) / 2) * 3.5}
                    compact
                    draw
                    delayMs={idx * 65}
                  />
                ))}
              </div>
              {hand.cards.length > 0 ? (
                <div className="hand-pill-row">
                  <span className={`hand-badge tone-${tone}`}>
                    {showOut && hand.outcome
                      ? outcomeBadgeText(hand.outcome)
                      : handLabel(hand.cards, hand.fromSplit)}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : null;

  const bubbleBlock = thinking ? (
    <div
      className={`speech-bubble thinking-bubble ${isTanking ? "tanking" : ""}`}
      key={`${cueKey}-${beat}`}
      aria-live="polite"
    >
      <span className="speech-text">{thinkLine}</span>
      <span className="dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  ) : reaction ? (
    <div
      className={`speech-bubble reaction-bubble tone-${reaction.tone}`}
      key={`react-${reaction.id}`}
      aria-live="polite"
    >
      <span className="speech-text">{reaction.text}</span>
    </div>
  ) : null;

  const capsuleBlock = (
    <div className="capsule">
      <Avatar name={player.name} personaId={player.personaId} you={you} mood={player.mood} />
      <div className="capsule-meta">
        <div className="capsule-name">
          {editing ? (
            <input
              ref={inputRef}
              className="who-input"
              value={draft}
              maxLength={16}
              aria-label="改名"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(player.name);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span className="who" title={persona ? `${player.name} · ${persona.style.tagline}` : player.name}>
              {player.name}
            </span>
          )}
          {you ? <span className="tag you-tag">你</span> : null}
          {!you && streak >= 2 ? <span className="tag streak-tag">连胜×{streak}</span> : null}
          {renameable && !editing ? (
            <button
              type="button"
              className="rename-btn"
              onClick={() => {
                setDraft(player.name);
                setEditing(true);
              }}
            >
              改名
            </button>
          ) : null}
          {!player.inHand ? <span className="tag">旁观</span> : null}
        </div>
        <div className="capsule-tokens">
          <span className="stack-val">
            {formatTokens(player.tokens)} <span className="token-unit">Tokens</span>
          </span>
          {wager > 0 ? <span className="seat-bet">注 {formatTokens(wager)}</span> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={[
        "seat",
        `seat-${place}`,
        topSide ? "seat-top-side" : "",
        active ? "active" : "",
        you ? "you" : "",
        thinking ? "thinking" : "",
        seatOutcomeClass,
      ]
        .filter(Boolean)
        .join(" ")}
      data-player-id={player.id}
    >
      {topSide ? (
        <>
          {capsuleBlock}
          {handsBlock}
          {bubbleBlock}
        </>
      ) : (
        <>
          {bubbleBlock}
          {handsBlock}
          {capsuleBlock}
        </>
      )}
    </div>
  );
}
