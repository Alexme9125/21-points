import { useEffect, useState } from "react";
import {
  chipsForStage,
  FX_MS,
  openingRevealStage,
  RESULT_LOG_KINDS,
  shouldShowDealerHole,
  type PublicState,
  type RevealFxStage,
} from "@hotpot/engine";

function outcomeKey(state: PublicState | null): string {
  if (!state) return "";
  return `${state.handNumber}-${state.dealsThisHand}-${state.phase}-${state.outcome?.kind ?? ""}-${state.outcome?.amount ?? 0}`;
}

function statusForStage(stage: RevealFxStage, fallback: string): string {
  if (stage === "flip") return "庄家开牌";
  if (stage === "result") return "比点数";
  if (stage === "payout") return "派彩";
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
    const timers: number[] = [];
    const later = (ms: number, next: RevealFxStage) => {
      timers.push(window.setTimeout(() => setStage(next), ms));
    };
    later(FX_MS.flip, "flip");
    later(FX_MS.flip + FX_MS.result, "result");
    later(FX_MS.flip + FX_MS.result + FX_MS.payout, "payout");
    later(FX_MS.flip + FX_MS.result + FX_MS.payout + 400, "done");
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const staged =
    state && state.phase === "reveal"
      ? chipsForStage(state.pot, state.players, stage)
      : null;

  const players = state?.players.map((p) => {
    if (!staged) return p;
    const tokens = staged.tokens[p.id];
    return tokens === undefined ? p : { ...p, tokens };
  });

  const hideResultLog = stage === "wager" || stage === "flip";
  const logs = (state?.logs ?? []).filter((line) => !(hideResultLog && RESULT_LOG_KINDS.has(line.kind)));

  return {
    stage,
    key,
    showDealerHole: shouldShowDealerHole(stage, Boolean(state?.dealer.hidden), state?.phase === "reveal"),
    pool: staged?.pot ?? state?.pot ?? 0,
    players: players ?? state?.players,
    logs,
    status: statusForStage(stage, fallbackStatus),
  };
}
