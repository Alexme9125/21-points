import { formatTokens, type BetRange } from "@hotpot/engine";
import { useEffect, useState } from "react";

export function ActionBar({
  range,
  disabled,
  onFold,
  onAdd,
}: {
  range: BetRange | null;
  disabled: boolean;
  onFold: () => void;
  onAdd: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(range?.min ?? 0);
  useEffect(() => {
    if (range) setAmount(range.min);
  }, [range?.min, range?.max, range?.locked]);

  if (!range) {
    return (
      <div className="action-bar">
        <button className="btn ghost" disabled={disabled} onClick={onFold}>
          放弃
        </button>
      </div>
    );
  }

  return (
    <div className="action-bar">
      <button className="btn ghost fold-btn" disabled={disabled} onClick={onFold}>
        放弃
      </button>
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
      <button className="btn primary add-btn" disabled={disabled} onClick={() => onAdd(amount)}>
        {range.locked ? "最小添菜" : "添菜"}
      </button>
    </div>
  );
}
