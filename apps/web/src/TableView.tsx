import { cardKey, DEALER_NAME, decksForSeats, DEFAULT_CONFIG, formatTokens, handLabel, MAX_SEATS, MIN_SEATS, type PlayerAction, type PublicPlayer } from "@hotpot/engine";
import { useEffect, useState } from "react";
import { ActionBar } from "./ActionBar";
import { CardView } from "./CardView";
import { HintBar } from "./HintBar";
import { SeatCapsule } from "./SeatCapsule";
import { SeatCountStepper } from "./SeatCountStepper";
import { SettlementModal } from "./SettlementModal";
import { TableFx } from "./TableFx";
import type { RoomSnapshot } from "./api";
import { placeFor } from "./seats";
import { useRevealPlay } from "./revealPlay";
import { isSoundOn, setSoundOn, unlockSound } from "./sound";

export function TableView({
  room,
  now,
  error,
  onAction,
  onContinue,
  onLeave,
  onFillBots,
  onSetSeats,
  onOpenRules,
  onRename,
}: {
  room: RoomSnapshot;
  now: number;
  error?: string;
  onAction: (action: PlayerAction) => void;
  onContinue: () => void;
  onLeave: () => void;
  onFillBots: () => void;
  onSetSeats: (n: number) => void;
  onOpenRules: () => void;
  onRename: (name: string) => void;
}) {
  const state = room.state;
  const play = useRevealPlay(state, room.status);
  const seats = (play.players ??
    room.seats.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      personaId: s.personaId,
      tokens: DEFAULT_CONFIG.startingTokens,
      inHand: true,
    }))) as PublicPlayer[];
  const youIndex = Math.max(0, seats.findIndex((p) => p.id === room.you));
  const remain = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : null;
  const yourTurn = Boolean(
    state && (state.phase === "awaiting" || state.phase === "betting") && state.currentPlayerId === room.you,
  );
  const currentKind = seats.find((p) => p.id === state?.currentPlayerId)?.kind;
  const showTurnClock = Boolean(
    remain !== null &&
      (state?.phase === "awaiting" || state?.phase === "betting") &&
      currentKind === "human",
  );
  const turnKey = `${state?.dealsThisHand}-${state?.currentPlayerId}-${state?.phase}-${state?.currentHandIndex ?? 0}`;
  const [lockedTurn, setLockedTurn] = useState("");
  const [sound, setSound] = useState(isSoundOn);
  useEffect(() => {
    if (state?.phase !== "awaiting" && state?.phase !== "betting") setLockedTurn("");
  }, [state?.phase, turnKey]);

  const drawKey = `${state?.handNumber ?? 0}-${state?.dealsThisHand ?? 0}-${state?.dealer.cards.length ?? 0}-${play.showDealerHole}`;
  const maxRounds = state?.config.roundsUntilSettle ?? DEFAULT_CONFIG.roundsUntilSettle;
  const minBet = state?.config.minBet ?? DEFAULT_CONFIG.minBet;
  const dealer = state?.dealer;
  const dealerCards = dealer?.cards ?? [];
  const seatCount = Math.max(1, room.seatCount ?? seats.length ?? DEFAULT_CONFIG.seatCount);
  const occupied = room.seats.length;
  const deckCount = state?.config.deckCount ?? decksForSeats(seatCount);

  function act(action: PlayerAction) {
    setLockedTurn(turnKey);
    onAction(action);
  }

  return (
    <div className="table-page">
      <header className="topbar">
        <div className="top-brand">
          <strong>21点</strong>
          <span className="stakes">
            最小 {formatTokens(minBet)} · 最大 {formatTokens(state?.config.maxBet ?? DEFAULT_CONFIG.maxBet)} · {deckCount} 副牌
          </span>
          {error ? <span className="error"> {error}</span> : null}
        </div>
        <div className="top-center">
          {state
            ? `第 ${state.handNumber} 盘 · ${state.dealsThisHand}/${maxRounds} 局 · ${deckCount} 副`
            : `等待开局 · ${occupied}/${seatCount} 人 · ${deckCount} 副牌`}
        </div>
        <div className="top-right">
          <em className="status-text">{play.status}</em>
          {showTurnClock ? <span className="timer">{remain}s</span> : null}
          <button
            className={`text-btn sound-btn ${sound ? "on" : "off"}`}
            type="button"
            aria-pressed={sound}
            onClick={() => {
              const next = !sound;
              setSoundOn(next);
              setSound(next);
              if (next) void unlockSound();
            }}
          >
            {sound ? "音效开" : "音效关"}
          </button>
          <button className="text-btn" type="button" onClick={onOpenRules}>
            规则
          </button>
          <code>{room.code}</code>
          <button className="text-btn" onClick={onLeave}>
            离开
          </button>
        </div>
      </header>

      <div className="felt-wrap">
        <div className={`felt seats-${seatCount} ${play.stage === "wager" ? "posting" : ""}`}>
          <div className="board">
            {dealerCards.length > 0 || dealer?.hidden ? (
              <div className="board-cards" key={drawKey}>
                {dealerCards[0] ? (
                  <CardView card={dealerCards[0]} tilt={-6} draw delayMs={0} />
                ) : null}
                {dealer?.hidden || (state?.phase === "reveal" && !play.showDealerHole) ? (
                  <CardView faceDown tilt={6} draw delayMs={90} />
                ) : (
                  dealerCards.slice(1).map((card, i) => (
                    <CardView
                      key={cardKey(card)}
                      card={card}
                      tilt={i % 2 === 0 ? 6 : -4}
                      draw
                      delayMs={90 + i * 70}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="waiting-copy">{room.started ? "准备发牌" : "等待玩家入座"}</div>
            )}
            <div className="pool" data-pool>
              <div className="chips" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div>
                <small>
                  <span className="pool-title">{DEALER_NAME}</span>
                  <span className="pool-ante">
                    {dealer && !dealer.hidden && dealer.cards.length
                      ? ` · ${handLabel(dealer.cards)}`
                      : " · 闲家对庄家"}
                  </span>
                </small>
                <b>{formatTokens(play.pool)}</b>
              </div>
            </div>
            <HintBar hint={state?.hint ?? null} />
          </div>
          {Array.from({ length: seatCount }, (_, index) => {
            const player = seats[index];
            const place = placeFor(youIndex, index, seatCount);
            if (!player) {
              return (
                <div key={`empty-${index}`} className={`seat seat-${place} empty`}>
                  <div className="capsule">空位</div>
                </div>
              );
            }
            const isCurrent = state?.currentPlayerId === player.id;
            const botThinking = Boolean(
              (state?.phase === "awaiting" || state?.phase === "betting") && isCurrent && player.kind === "bot",
            );
            const dealt = Boolean(player.cards?.hands.some((h) => h.cards.length > 0));
            return (
              <SeatCapsule
                key={player.id}
                player={player}
                you={player.id === room.you}
                active={Boolean(isCurrent)}
                thinking={botThinking}
                place={place}
                showCards={dealt}
                renameable={room.mode === "pvp" && player.id === room.you}
                onRename={onRename}
              />
            );
          })}
          <TableFx state={state} stage={play.stage} />
        </div>
      </div>

      <footer className="bottom-dock">
        {yourTurn && state ? (
          <ActionBar
            phase={state.phase === "betting" ? "betting" : "awaiting"}
            range={state.betRange ?? null}
            actions={state.legalActions}
            disabled={lockedTurn === turnKey}
            lastBet={state.lastBet ?? null}
            wager={
              seats.find((p) => p.id === room.you)?.cards?.hands[state.currentHandIndex ?? 0]?.bet ?? 0
            }
            onBet={(amount) => act({ type: "bet", amount })}
            onHit={() => act({ type: "hit" })}
            onStand={() => act({ type: "stand" })}
            onDouble={() => act({ type: "double" })}
            onSplit={() => act({ type: "split" })}
            onSurrender={() => act({ type: "surrender" })}
          />
        ) : !room.started && room.hostId === room.you ? (
          <div className="action-bar wait-bar">
            <SeatCountStepper
              value={seatCount}
              min={Math.max(MIN_SEATS, occupied)}
              max={MAX_SEATS}
              onChange={onSetSeats}
            />
            <p className="muted">
              分享房间码 {room.code}，或用 Bot 补齐到 {seatCount} 人
              {room.mode === "pvp" ? "。点自己座位上的「改名」换昵称。" : ""}
            </p>
            <button className="btn primary" onClick={onFillBots}>
              {occupied >= seatCount ? "开局" : "用 Bot 开局"}
            </button>
          </div>
        ) : (
          <p className="log-line">{play.logs.at(-1)?.text ?? play.status}</p>
        )}
        <div className="log">
          {play.logs.slice(-4).map((line) => (
            <div key={line.id}>{line.text}</div>
          ))}
        </div>
      </footer>

      {state ? (
        <SettlementModal
          state={state}
          you={room.you}
          mode={room.mode}
          onContinue={onContinue}
          onLeave={onLeave}
        />
      ) : null}
    </div>
  );
}
