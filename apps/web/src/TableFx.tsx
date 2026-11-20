import { formatTokens, type PublicState, type RevealFxStage, type RevealOutcome } from "@hotpot/engine";
import { useEffect, useRef, useState } from "react";
import { playOutcome, playWager } from "./sound";

interface Ball {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  tier: "emerald" | "crimson" | "navy" | "brass";
}

interface Slogan {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: string;
}

function centerOf(el: Element, root: DOMRect): { x: number; y: number } {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2 - root.left, y: box.top + box.height / 2 - root.top };
}

function sloganFor(outcome: RevealOutcome): { text: string; tone: string } | null {
  if (outcome.kind === "blackjack") {
    return { text: `黑杰克 +${formatTokens(outcome.amount - outcome.wager)}`, tone: "triple" };
  }
  return null;
}

function chipCount(amount: number): number {
  return Math.min(7, Math.max(3, Math.round(amount / 4_000)));
}

function chipTierFor(amount: number): Ball["tier"] {
  if (amount >= 10_000) return "brass";
  if (amount >= 5_000) return "crimson";
  if (amount >= 2_000) return "navy";
  return "emerald";
}

export function TableFx({
  state,
  stage,
  you,
}: {
  state: PublicState | null;
  stage: RevealFxStage;
  you: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const fired = useRef("");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [slogans, setSlogans] = useState<Slogan[]>([]);

  const outcomeKey = state
    ? `${state.handNumber}-${state.dealsThisHand}-${state.phase}-${state.outcome?.kind ?? ""}-${state.outcome?.amount ?? 0}`
    : "";
  const dealKey = state ? `deal-${state.handNumber}-${state.dealsThisHand}-${state.phase}` : "";

  function fly(fromEl: Element | null, toEl: Element | null, count: number, tier: Ball["tier"]) {
    const host = hostRef.current;
    if (!host || !fromEl || !toEl) return;
    const root = host.getBoundingClientRect();
    const from = centerOf(fromEl, root);
    const to = centerOf(toEl, root);
    const next: Ball[] = [];
    for (let i = 0; i < count; i++) {
      seq.current += 1;
      const jitter = (n: number) => n + (Math.random() - 0.5) * 16;
      next.push({
        id: seq.current,
        x: jitter(from.x),
        y: jitter(from.y),
        dx: to.x - from.x + (Math.random() - 0.5) * 20,
        dy: to.y - from.y + (Math.random() - 0.5) * 14,
        delay: i * 48,
        tier,
      });
    }
    setBalls((prev) => [...prev, ...next]);
    window.setTimeout(() => {
      setBalls((prev) => prev.filter((b) => !next.some((n) => n.id === b.id)));
    }, 860 + count * 48);
  }

  function shout(playerEl: Element | null, text: string, tone: string) {
    const host = hostRef.current;
    if (!host || !playerEl) return;
    const root = host.getBoundingClientRect();
    const at = centerOf(playerEl, root);
    seq.current += 1;
    const item: Slogan = { id: seq.current, text, x: at.x, y: at.y - 24, tone };
    setSlogans((prev) => [...prev, item]);
    window.setTimeout(() => {
      setSlogans((prev) => prev.filter((s) => s.id !== item.id));
    }, 1550);
  }

  useEffect(() => {
    if (!state || state.phase !== "awaiting") return;
    const host = hostRef.current;
    if (!host) return;
    const pool = host.parentElement?.querySelector("[data-pool] .chips") ?? host.parentElement?.querySelector("[data-pool]");
    const seats = host.parentElement?.querySelectorAll("[data-player-id]");
    if (!pool || !seats?.length) return;
    playWager();
    seats.forEach((seat, i) => {
      const id = seat.getAttribute("data-player-id");
      const p = state.players.find((pl) => pl.id === id);
      const wager = (p?.cards?.hands ?? []).reduce((sum, h) => sum + h.bet, 0);
      if (wager <= 0) return;
      window.setTimeout(() => fly(seat, pool, 3, chipTierFor(wager)), i * 70);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealKey]);

  useEffect(() => {
    const fireKey = `${outcomeKey}:${stage}`;
    if (!state || state.phase !== "reveal" || !fireKey || fired.current === fireKey) return;
    fired.current = fireKey;

    const host = hostRef.current;
    if (!host) return;
    const root = host.parentElement;
    const pool = root?.querySelector("[data-pool] .chips") ?? root?.querySelector("[data-pool]");

    if (stage === "result") {
      let preferredSound: RevealOutcome["kind"] | null = null;
      let fallbackSound: RevealOutcome["kind"] | null = null;
      for (const player of state.players) {
        const seat = root?.querySelector(`[data-player-id="${player.id}"]`);
        for (const hand of player.cards?.hands ?? []) {
          if (!hand.outcome) continue;
          const slogan = sloganFor(hand.outcome);
          if (slogan) shout(seat, slogan.text, slogan.tone);
          if (!fallbackSound) fallbackSound = hand.outcome.kind;
          if (player.id === you && !preferredSound) preferredSound = hand.outcome.kind;
        }
      }
      const soundKind = preferredSound ?? fallbackSound;
      if (soundKind) playOutcome(soundKind);
      return;
    }

    if (stage === "payout") {
      let anyPayout = false;
      for (const player of state.players) {
        const seat = root?.querySelector(`[data-player-id="${player.id}"]`);
        for (const hand of player.cards?.hands ?? []) {
          const outcome = hand.outcome;
          if (!outcome || outcome.amount <= 0) continue;
          anyPayout = true;
          fly(pool, seat, chipCount(outcome.amount), chipTierFor(outcome.amount));
        }
      }
      if (anyPayout) playWager();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, outcomeKey]);

  return (
    <div className="fx-layer" ref={hostRef} aria-hidden="true">
      {balls.map((ball) => (
        <span
          key={ball.id}
          className={`chip-ball chip-${ball.tier}`}
          style={{
            left: ball.x,
            top: ball.y,
            ["--dx" as string]: `${ball.dx}px`,
            ["--dy" as string]: `${ball.dy}px`,
            ["--delay" as string]: `${ball.delay}ms`,
          }}
        />
      ))}
      {slogans.map((item) => (
        <span
          key={item.id}
          className={`slogan ${item.tone}`}
          style={{ left: item.x, top: item.y }}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
