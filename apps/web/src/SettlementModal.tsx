import { formatTokens, type PublicState } from "@hotpot/engine";

export function SettlementModal({
  state,
  you,
  mode,
  onContinue,
  onLeave,
}: {
  state: PublicState;
  you: string;
  mode?: "pve" | "pvp";
  onContinue: () => void;
  onLeave: () => void;
}) {
  const settlement = state.settlement;
  if (!settlement || (state.phase !== "settlement" && state.phase !== "gameover")) return null;
  const title =
    settlement.reason === "rounds"
      ? `满 ${state.config.roundsUntilSettle} 局，本盘结算`
      : "对局结束";
  return (
    <div className="overlay">
      <div className="modal">
        <h2>{title}</h2>
        <ul className="delta-list">
          {state.players.map((p) => {
            const d = settlement.deltas[p.id] ?? 0;
            return (
              <li key={p.id} className={p.id === you ? "me" : ""}>
                <span>
                  {p.name}
                  {p.id === you ? "（你）" : ""}
                </span>
                <b className={d >= 0 ? "up" : "down"}>
                  {d >= 0 ? "+" : ""}
                  {formatTokens(d)}
                </b>
              </li>
            );
          })}
        </ul>
        {mode === "pvp" ? (
          <p className="muted">返回大厅后本局立即结束，你的座位空出，房间回到等待开局。</p>
        ) : null}
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
