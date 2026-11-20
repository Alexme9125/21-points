import { formatTokens, personaById, type PublicState } from "@hotpot/engine";
import { Avatar } from "./Avatar";

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
      ? `第 ${state.handNumber} 盘结算`
      : "对局结束";
  const subtitle =
    settlement.reason === "rounds"
      ? `本盘满 ${state.config.roundsUntilSettle} 局，按本盘净盈亏排序`
      : "全桌筹码已不足最小注";

  const ranked = [...state.players].sort((a, b) => {
    const da = settlement.deltas[a.id] ?? 0;
    const db = settlement.deltas[b.id] ?? 0;
    return db - da;
  });

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settle-title">
        <div className="modal-head">
          <h2 id="settle-title">{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>

        <ul className="delta-list">
          {ranked.map((p, idx) => {
            const d = settlement.deltas[p.id] ?? 0;
            const persona = p.personaId ? personaById(p.personaId) : undefined;
            return (
              <li key={p.id} className={p.id === you ? "me" : ""}>
                <div className="delta-player">
                  <span className="delta-rank">{idx + 1}</span>
                  <Avatar name={p.name} personaId={p.personaId} you={p.id === you} />
                  <div className="delta-info">
                    <span className="delta-name">
                      {p.name}
                      {p.id === you ? <em className="tag you-tag">你</em> : null}
                    </span>
                    <small className="muted">
                      余额 {formatTokens(p.tokens)} Tokens
                      {persona ? ` · ${persona.style.tagline}` : ""}
                    </small>
                  </div>
                </div>
                <b className={`delta-num ${d > 0 ? "up" : d < 0 ? "down" : "even"}`}>
                  {d > 0 ? "+" : ""}
                  {formatTokens(d)} Tokens
                </b>
              </li>
            );
          })}
        </ul>

        {mode === "pvp" ? (
          <p className="muted settle-note">返回大厅后本局立即结束，你的座位空出，房间回到等待开局。</p>
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
