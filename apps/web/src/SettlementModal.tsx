import { formatTokens, type PublicState } from "@hotpot/engine";

export function SettlementModal({
  state,
  you,
  onContinue,
  onLeave,
}: {
  state: PublicState;
  you: string;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const settlement = state.settlement;
  if (!settlement || (state.phase !== "settlement" && state.phase !== "gameover")) return null;
  const title =
    settlement.reason === "empty" ? "项目池已被清空" : settlement.reason === "split" ? "满 20 次发牌，摊池" : "对局结束";
  return (
    <div className="overlay">
      <div className="modal">
        <h2>{title}</h2>
        <ul className="delta-list">
          {state.players.map((p) => {
            const d = settlement.deltas[p.id] ?? 0;
            return (
              <li key={p.id} className={p.id === you ? "me" : ""}>
                <span>{p.id === you ? "You" : p.name}</span>
                <b className={d >= 0 ? "up" : "down"}>
                  {d >= 0 ? "+" : ""}
                  {formatTokens(d)}
                </b>
              </li>
            );
          })}
        </ul>
        <p className="muted">
          项目池剩余 {formatTokens(settlement.leftoverPool)} Tokens
          {settlement.splitEach ? ` · 每人分得 ${formatTokens(settlement.splitEach)}` : ""}
        </p>
        <div className="row">
          {state.phase === "gameover" ? (
            <button className="btn primary" onClick={onLeave}>
              返回大厅
            </button>
          ) : (
            <>
              <button className="btn ghost" onClick={onLeave}>
                返回大厅
              </button>
              <button className="btn primary" onClick={onContinue}>
                继续下一盘
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
