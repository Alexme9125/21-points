import { formatTokens, type ActionType, type BetRange } from "@hotpot/engine";
import { useEffect, useState } from "react";

export function ActionBar({
  phase,
  range,
  actions,
  disabled,
  onBet,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
}: {
  phase: "betting" | "awaiting";
  range: BetRange | null;
  actions: ActionType[];
  disabled: boolean;
  onBet: (amount: number) => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  onSurrender: () => void;
}) {
  const [amount, setAmount] = useState(range?.min ?? 0);
  useEffect(() => {
    if (range) setAmount(range.min);
  }, [range?.min, range?.max, range?.locked]);

  if (phase === "betting") {
    if (!range) {
      return (
        <div className="action-bar">
          <p className="muted">筹码不足，无法下注</p>
        </div>
      );
    }
    return (
      <div className="action-bar">
        <div className="slider-wrap">
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={1000}
            value={amount}
            disabled={disabled || range.locked}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <b>{formatTokens(amount)}</b>
        </div>
        <button className="btn primary add-btn" disabled={disabled} onClick={() => onBet(amount)}>
          下注
        </button>
      </div>
    );
  }

  const has = (type: ActionType) => actions.includes(type);

  return (
    <div className="action-bar play-actions">
      {has("surrender") ? (
        <button className="btn ghost fold-btn" disabled={disabled} onClick={onSurrender}>
          投降
        </button>
      ) : null}
      {has("split") ? (
        <button className="btn ghost" disabled={disabled} onClick={onSplit}>
          分牌
        </button>
      ) : null}
      {has("double") ? (
        <button className="btn ghost" disabled={disabled} onClick={onDouble}>
          加倍
        </button>
      ) : null}
      {has("hit") ? (
        <button className="btn" disabled={disabled} onClick={onHit}>
          要牌
        </button>
      ) : null}
      <button className="btn primary add-btn" disabled={disabled} onClick={onStand}>
        停牌
      </button>
    </div>
  );
}
