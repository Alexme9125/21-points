import {
  betChipAmounts,
  clampBet,
  doubleLastBetAmount,
  formatBetDraft,
  formatTokens,
  parseBetInput,
  repeatBetAmount,
  type ActionType,
  type BetRange,
} from "@hotpot/engine";
import { useEffect, useState } from "react";

function defaultAmount(range: BetRange, lastBet: number | null): number {
  if (lastBet && lastBet >= range.min && lastBet <= range.max) return lastBet;
  return range.min;
}

export function ActionBar({
  phase,
  range,
  actions,
  disabled,
  lastBet,
  wager,
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
  lastBet: number | null;
  wager: number;
  onBet: (amount: number) => void;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  onSplit: () => void;
  onSurrender: () => void;
}) {
  const [amount, setAmount] = useState(range?.min ?? 0);
  const [draft, setDraft] = useState(range ? formatBetDraft(range.min) : "");
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (!range) return;
    const next = defaultAmount(range, lastBet);
    setAmount(next);
    setDraft(formatBetDraft(next));
    setHint("");
  }, [range?.min, range?.max, range?.locked, lastBet]);

  if (phase === "betting") {
    if (!range) {
      return (
        <div className="action-bar">
          <p className="muted">筹码不足，无法下注</p>
        </div>
      );
    }
    const chips = betChipAmounts(range.min, range.max);
    const limits = range;
    const repeat = repeatBetAmount(lastBet, limits);
    const doubled = doubleLastBetAmount(lastBet, limits);
    const only = chips.length === 1;
    const sliderValue = Math.min(limits.max, Math.max(limits.min, amount));

    function setFromSlider(value: number) {
      setAmount(value);
      setDraft(formatBetDraft(value));
      setHint("");
    }

    function submitCustom() {
      const parsed = parseBetInput(draft);
      if (parsed == null) {
        setHint("请输入金额，如 3K 或 3000");
        return;
      }
      if (parsed < limits.min || parsed > limits.max) {
        setHint(`须在 ${formatTokens(limits.min)}–${formatTokens(limits.max)}`);
        return;
      }
      onBet(clampBet(parsed, limits.min, limits.max, limits.min));
    }

    return (
      <div className="action-bar bet-actions">
        <div className="chip-bets">
          {chips.map((chip) => {
            const isMin = chip === range.min;
            const isMax = chip === range.max && chips.length > 1;
            const label = only
              ? `全下 ${formatTokens(chip)}`
              : isMin
                ? `最小 ${formatTokens(chip)}`
                : isMax
                  ? `最大 ${formatTokens(chip)}`
                  : formatTokens(chip);
            return (
              <button
                key={chip}
                type="button"
                className={`btn chip-btn ${isMax || only ? "primary" : "ghost"}`}
                disabled={disabled}
                onClick={() => onBet(chip)}
              >
                {label}
              </button>
            );
          })}
          {repeat ? (
            <button type="button" className="btn ghost chip-btn" disabled={disabled} onClick={() => onBet(repeat)}>
              续注
            </button>
          ) : null}
          {doubled ? (
            <button type="button" className="btn ghost chip-btn" disabled={disabled} onClick={() => onBet(doubled)}>
              续×2
            </button>
          ) : null}
        </div>
        <form
          className="custom-bet"
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabled) submitCustom();
          }}
        >
          <input
            className="bet-slider"
            type="range"
            min={range.min}
            max={range.max}
            step={range.min}
            value={sliderValue}
            disabled={disabled || range.locked}
            aria-label="自定义下注滑条"
            onChange={(e) => setFromSlider(Number(e.target.value))}
          />
          <input
            className="bet-input"
            value={draft}
            disabled={disabled || range.locked}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label="自定义下注金额"
            placeholder={formatBetDraft(range.min)}
            onChange={(e) => {
              setDraft(e.target.value);
              setHint("");
            }}
            onBlur={() => {
              const parsed = parseBetInput(draft);
              if (parsed == null) return;
              const snapped = clampBet(parsed, range.min, range.max, range.min);
              setAmount(snapped);
              setDraft(formatBetDraft(snapped));
            }}
          />
          <button type="submit" className="btn primary add-btn" disabled={disabled}>
            下注
          </button>
        </form>
        {hint ? <p className="custom-hint">{hint}</p> : null}
      </div>
    );
  }

  const has = (type: ActionType) => actions.includes(type);
  const extra = wager > 0 ? ` +${formatTokens(wager)}` : "";
  const half = wager > 0 ? ` · 收 ${formatTokens(Math.floor(wager / 2))}` : "";

  return (
    <div className="action-bar play-actions">
      {has("surrender") ? (
        <button className="btn ghost fold-btn" disabled={disabled} onClick={onSurrender}>
          投降{half}
        </button>
      ) : null}
      {has("split") ? (
        <button className="btn ghost" disabled={disabled} onClick={onSplit}>
          分牌{extra}
        </button>
      ) : null}
      {has("double") ? (
        <button className="btn ghost" disabled={disabled} onClick={onDouble}>
          加倍{extra}
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
