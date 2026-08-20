import {
  betChipAmounts,
  doubleLastBetAmount,
  formatTokens,
  repeatBetAmount,
  type ActionType,
  type BetRange,
} from "@hotpot/engine";

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
  if (phase === "betting") {
    if (!range) {
      return (
        <div className="action-bar">
          <p className="muted">筹码不足，无法下注</p>
        </div>
      );
    }
    const chips = betChipAmounts(range.min, range.max);
    const repeat = repeatBetAmount(lastBet, range);
    const doubled = doubleLastBetAmount(lastBet, range);
    const only = chips.length === 1;
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
        </div>
        {repeat ? (
          <div className="quick-bets">
            <button type="button" className="btn" disabled={disabled} onClick={() => onBet(repeat)}>
              续注 {formatTokens(repeat)}
            </button>
            {doubled ? (
              <button type="button" className="btn" disabled={disabled} onClick={() => onBet(doubled)}>
                续×2 {formatTokens(doubled)}
              </button>
            ) : null}
          </div>
        ) : null}
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
