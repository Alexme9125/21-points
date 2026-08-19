import { formatTokens, type PublicPlayer } from "@hotpot/engine";
import { useEffect, useState } from "react";
import { ActionBar } from "./ActionBar";
import { CardView } from "./CardView";
import { HintBar } from "./HintBar";
import { SeatCapsule } from "./SeatCapsule";
import { SettlementModal } from "./SettlementModal";
import type { RoomSnapshot } from "./api";

const PLACES = ["bottom", "right", "top", "left"] as const;

function placeFor(viewerIndex: number, seatIndex: number, count: number): (typeof PLACES)[number] {
  const offset = (seatIndex - viewerIndex + count) % count;
  return PLACES[offset] ?? "bottom";
}

export function TableView({
  room,
  now,
  error,
  onFold,
  onAdd,
  onContinue,
  onLeave,
  onFillBots,
}: {
  room: RoomSnapshot;
  now: number;
  error?: string;
  onFold: () => void;
  onAdd: (amount: number) => void;
  onContinue: () => void;
  onLeave: () => void;
  onFillBots: () => void;
}) {
  const state = room.state;
  const seats = state?.players ?? room.seats.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    personaId: s.personaId,
    tokens: 500_000,
    inHand: true,
  })) as PublicPlayer[];
  const youIndex = Math.max(0, seats.findIndex((p) => p.id === room.you));
  const remain = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : null;
  const yourTurn = Boolean(state && state.phase === "awaiting" && state.currentPlayerId === room.you);
  const turnKey = `${state?.dealsThisHand}-${state?.currentPlayerId}-${state?.phase}`;
  const [lockedTurn, setLockedTurn] = useState("");
  useEffect(() => {
    if (state?.phase !== "awaiting") setLockedTurn("");
  }, [state?.phase, turnKey]);

  return (
    <div className="table-page">
      <header className="topbar">
        <div>
          <strong>吃火锅</strong>
          <span>5K / 10K Tokens</span>
          {error ? <span className="error"> {error}</span> : null}
        </div>
        <div className="top-center">
          {state ? `第 ${state.handNumber} 盘 · 发牌 ${state.dealsThisHand}/20` : "等待开局"}
        </div>
        <div className="top-right">
          <em>{room.status}</em>
          {remain !== null && state?.phase === "awaiting" ? <span className="timer">{remain}s</span> : null}
          <code>{room.code}</code>
          <button className="text-btn" onClick={onLeave}>
            离开
          </button>
        </div>
      </header>

      <div className="felt-wrap">
        <div className="felt">
          <div className="board">
            {state?.hole ? (
              <div className="board-cards">
                <CardView card={state.hole[0]} tilt={-6} />
                <CardView card={state.hole[1]} tilt={6} />
                {state.third ? <CardView card={state.third} tilt={0} /> : <div className="ghost-card" />}
              </div>
            ) : (
              <div className="waiting-copy">{room.started ? "准备发牌" : "等待玩家入座"}</div>
            )}
            <div className="pool">
              <div className="chips" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div>
                <small>项目池</small>
                <b>{formatTokens(state?.projectPool ?? 0)}</b>
              </div>
            </div>
            <HintBar hint={state?.hint ?? null} />
          </div>
          {Array.from({ length: 4 }, (_, index) => {
            const player = seats[index];
            const place = placeFor(youIndex, index, 4);
            if (!player) {
              return (
                <div key={place} className={`seat seat-${place} empty`}>
                  <div className="capsule">空位</div>
                </div>
              );
            }
            return (
              <SeatCapsule
                key={player.id}
                player={player}
                you={player.id === room.you}
                active={state?.currentPlayerId === player.id}
                thinking={state?.phase === "awaiting" && state.currentPlayerId === player.id && player.kind === "bot"}
                place={place}
              />
            );
          })}
        </div>
      </div>

      <footer className="bottom-dock">
        {yourTurn ? (
          <ActionBar
            range={state?.betRange ?? null}
            disabled={lockedTurn === turnKey}
            onFold={() => {
              setLockedTurn(turnKey);
              onFold();
            }}
            onAdd={(amount) => {
              setLockedTurn(turnKey);
              onAdd(amount);
            }}
          />
        ) : !room.started && room.hostId === room.you ? (
          <div className="action-bar">
            <p className="muted">分享房间码 {room.code}，或用 LLM Bot 补齐空位</p>
            <button className="btn primary" onClick={onFillBots}>
              用 Bot 开局
            </button>
          </div>
        ) : (
          <p className="log-line">{state?.logs.at(-1)?.text ?? room.status}</p>
        )}
        <div className="log">
          {(state?.logs ?? []).slice(-4).map((line) => (
            <div key={line.id}>{line.text}</div>
          ))}
        </div>
      </footer>

      {state ? (
        <SettlementModal state={state} you={room.you} onContinue={onContinue} onLeave={onLeave} />
      ) : null}
    </div>
  );
}
