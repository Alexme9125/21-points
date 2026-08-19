import type { PublicState, RevealFxStage, RevealOutcome } from "@hotpot/engine";
import { useEffect, useRef, useState } from "react";
import { playOutcome, playWager } from "./sound";

interface Ball {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
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
  if (outcome.kind === "blackjack") return { text: "黑杰克", tone: "triple" };
  if (outcome.kind === "win") return { text: "赢", tone: "win" };
  if (outcome.kind === "push") return { text: "平", tone: "skip" };
  if (outcome.kind === "bust") return { text: "爆牌", tone: "horn" };
  if (outcome.kind === "lose") return { text: "输", tone: "lose" };
  if (outcome.kind === "surrender") return { text: "投降", tone: "skip" };
  return null;
}

function chipCount(amount: number): number {
  return Math.min(8, Math.max(4, Math.round(amount / 12_000)));
}

export function TableFx({
  state,
  stage,
}: {
  state: PublicState | null;
  stage: RevealFxStage;
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

  function fly(fromEl: Element | null, toEl: Element | null, count: number) {
    const host = hostRef.current;
    if (!host || !fromEl || !toEl) return;
    const root = host.getBoundingClientRect();
    const from = centerOf(fromEl, root);
    const to = centerOf(toEl, root);
    const next: Ball[] = [];
    for (let i = 0; i < count; i++) {
      seq.current += 1;
      const jitter = (n: number) => n + (Math.random() - 0.5) * 18;
      next.push({
        id: seq.current,
        x: jitter(from.x),
        y: jitter(from.y),
        dx: to.x - from.x + (Math.random() - 0.5) * 24,
        dy: to.y - from.y + (Math.random() - 0.5) * 16,
        delay: i * 45,
      });
    }
    setBalls((prev) => [...prev, ...next]);
    window.setTimeout(() => {
      setBalls((prev) => prev.filter((b) => !next.some((n) => n.id === b.id)));
    }, 900 + count * 45);
  }

  function shout(playerEl: Element | null, text: string, tone: string) {
    const host = hostRef.current;
    if (!host || !playerEl) return;
    const root = host.getBoundingClientRect();
    const at = centerOf(playerEl, root);
    seq.current += 1;
    const item: Slogan = { id: seq.current, text, x: at.x, y: at.y - 28, tone };
    setSlogans((prev) => [...prev, item]);
    window.setTimeout(() => {
      setSlogans((prev) => prev.filter((s) => s.id !== item.id));
    }, 1700);
  }

  useEffect(() => {
    if (!state || state.phase !== "awaiting") return;
    const host = hostRef.current;
    if (!host) return;
    const pool = host.parentElement?.querySelector("[data-pool]");
    const seats = host.parentElement?.querySelectorAll("[data-player-id]");
    if (!pool || !seats?.length) return;
    shout(pool, "开牌", "ante");
    playWager();
    seats.forEach((seat, i) => {
      window.setTimeout(() => fly(seat, pool, 3), i * 80);
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
    const pool = root?.querySelector("[data-pool]");

    if (stage === "result") {
      for (const player of state.players) {
        const seat = root?.querySelector(`[data-player-id="${player.id}"]`);
        for (const hand of player.cards?.hands ?? []) {
          if (!hand.outcome) continue;
          const slogan = sloganFor(hand.outcome);
          if (slogan) shout(seat, slogan.text, slogan.tone);
          playOutcome(hand.outcome.kind);
        }
      }
      return;
    }

    if (stage === "payout") {
      for (const player of state.players) {
        const seat = root?.querySelector(`[data-player-id="${player.id}"]`);
        for (const hand of player.cards?.hands ?? []) {
          const outcome = hand.outcome;
          if (!outcome || outcome.amount <= 0) continue;
          fly(pool, seat, chipCount(outcome.amount));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, outcomeKey]);

  return (
    <div className="fx-layer" ref={hostRef}>
      {balls.map((ball) => (
        <span
          key={ball.id}
          className="chip-ball"
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
        <b
          key={item.id}
          className={`slogan ${item.tone}`}
          style={{ left: item.x, top: item.y }}
        >
          {item.text}
        </b>
      ))}
    </div>
  );
}
