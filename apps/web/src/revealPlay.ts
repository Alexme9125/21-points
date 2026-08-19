import { useEffect, useState } from "react";
import {
  chipsForStage,
  FX_MS,
  openingRevealStage,
  RESULT_LOG_KINDS,
  shouldShowThird,
  type PublicState,
  type RevealFxStage,
} from "@hotpot/engine";

function outcomeKey(state: PublicState | null): string {
  if (!state) return "";
  return `${state.handNumber}-${state.dealsThisHand}-${state.currentPlayerId}-${state.phase}-${state.outcome?.kind ?? ""}-${state.outcome?.amount ?? 0}`;
}

function statusForStage(stage: RevealFxStage, fallback: string): string {
  if (stage === "wager") return "添菜入池";
  if (stage === "flip") return "开第三张";
  return fallback;
}

export function useRevealPlay(state: PublicState | null, fallbackStatus: string) {
  const key = outcomeKey(state);
  const opening = openingRevealStage(state?.phase === "reveal" ? state.outcome?.kind : undefined);
  const [seenKey, setSeenKey] = useState(key);
  const [stage, setStage] = useState<RevealFxStage>(opening);

  if (key !== seenKey) {
    setSeenKey(key);
    setStage(opening);
  }

  useEffect(() => {
    if (!state || state.phase !== "reveal" || !state.outcome) return;
    const kind = state.outcome.kind;
    const timers: number[] = [];
    const later = (ms: number, next: RevealFxStage) => {
      timers.push(window.setTimeout(() => setStage(next), ms));
    };
    if (kind === "fold" || kind === "consecutive") {
      later(FX_MS.result + 400, "done");
    } else {
      later(FX_MS.wager, "flip");
      later(FX_MS.wager + FX_MS.flip, "result");
      if (kind === "win" || kind === "triple_win" || kind === "horn") {
        later(FX_MS.wager + FX_MS.flip + FX_MS.result, "payout");
        later(FX_MS.wager + FX_MS.flip + FX_MS.result + FX_MS.payout, "done");
      } else {
        later(FX_MS.wager + FX_MS.flip + FX_MS.result, "done");
      }
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
    // Re-arm only when a new reveal arrives, not on every snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const outcome = state?.phase === "reveal" ? state.outcome : null;
  const actorId = state?.currentPlayerId ?? null;
  const actor = actorId ? state?.players.find((p) => p.id === actorId) : undefined;
  const staged =
    state && outcome && actor
      ? chipsForStage(state.projectPool, actor.tokens, outcome, stage)
      : null;

  const players = state?.players.map((p) => {
    if (!staged || p.id !== actorId) return p;
    return { ...p, tokens: staged.actorTokens };
  });

  const hideResultLog = stage === "wager" || stage === "flip";
  const logs = (state?.logs ?? []).filter((line) => !(hideResultLog && RESULT_LOG_KINDS.has(line.kind)));

  return {
    stage,
    key,
    showThird: shouldShowThird(stage, Boolean(state?.third)),
    pool: staged?.pool ?? state?.projectPool ?? 0,
    players: players ?? state?.players,
    logs,
    status: statusForStage(stage, fallbackStatus),
  };
}
