import {
  botRevealReactions,
  cardKey,
  CARDS_PER_DECK,
  DEALER_NAME,
  decksForSeats,
  DEFAULT_CONFIG,
  formatTokens,
  handLabel,
  MAX_SEATS,
  MIN_SEATS,
  rankLabel,
  type BotReaction,
  type PlayerAction,
  type PublicPlayer,
} from "@hotpot/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionBar } from "./ActionBar";
import { CardView } from "./CardView";
import { HintBar } from "./HintBar";
import { SeatCapsule } from "./SeatCapsule";
import { SeatCountStepper } from "./SeatCountStepper";
import { SettlementModal } from "./SettlementModal";
import { TableFx } from "./TableFx";
import type { RoomSnapshot } from "./api";
import { useRevealPlay } from "./revealPlay";
import { placeFor } from "./seats";
import { isSoundOn, playCardSlide, setSoundOn, unlockSound } from "./sound";

function SoundIcon({ on }: { on: boolean }) {
  return on ? (
    <svg viewBox="0 0 20 20" className="icon-sm" aria-hidden="true">
      <path d="M3.5 7.5 H6.8 L11 4 V16 L6.8 12.5 H3.5 Z" fill="currentColor" />
      <path d="M13.5 7.2 A4.2 4.2 0 0 1 13.5 12.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.7 5.1 A7.2 7.2 0 0 1 15.7 14.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="icon-sm" aria-hidden="true">
      <path d="M3.5 7.5 H6.8 L11 4 V16 L6.8 12.5 H3.5 Z" fill="currentColor" />
      <path d="M13.5 7.5 L17.5 12.5 M17.5 7.5 L13.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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
  const actingHand = state?.players.find((p) => p.id === state.currentPlayerId)?.cards?.hands[
    state.currentHandIndex ?? 0
  ];
  // Hit stays on the same player/phase; include live hand and last log so lock releases after draw.
  const turnKey = `${state?.dealsThisHand}-${state?.currentPlayerId}-${state?.phase}-${state?.currentHandIndex ?? 0}-${actingHand?.cards.length ?? 0}-${actingHand?.status ?? ""}-${state?.logs.at(-1)?.id ?? 0}`;

  const [lockedTurn, setLockedTurn] = useState("");
  const [sound, setSound] = useState(isSoundOn);
  const [copied, setCopied] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [reactionsByPlayer, setReactionsByPlayer] = useState<Record<string, BotReaction>>({});
  const lastCardTotal = useRef(0);
  const lastReactionId = useRef(0);
  const revealReactKey = useRef("");

  useEffect(() => {
    if (state?.phase !== "awaiting" && state?.phase !== "betting") setLockedTurn("");
  }, [state?.phase, turnKey]);

  useEffect(() => {
    if (error) setLockedTurn("");
  }, [error]);

  // Subtle card-slide sound when new cards appear on the felt.
  const totalVisibleCards = useMemo(() => {
    if (!state) return 0;
    const playerCards = state.players.reduce(
      (sum, p) => sum + (p.cards?.hands.reduce((hs, h) => hs + h.cards.length, 0) ?? 0),
      0,
    );
    const dealerCount = play.showDealerHole ? state.dealer.cards.length : Math.min(1, state.dealer.cards.length);
    return playerCards + dealerCount;
  }, [state, play.showDealerHole]);

  useEffect(() => {
    if (totalVisibleCards > lastCardTotal.current && lastCardTotal.current >= 0) {
      playCardSlide();
    }
    lastCardTotal.current = totalVisibleCards;
  }, [totalVisibleCards]);

  // Clear lingering reaction bubbles as soon as a fresh betting round begins.
  useEffect(() => {
    if (state?.phase === "betting") {
      setReactionsByPlayer({});
    }
  }, [state?.phase, state?.handNumber, state?.dealsThisHand]);

  // Ephemeral mid-turn bot action reactions (double, split, hit 21, bust, surrender).
  useEffect(() => {
    const r = room.botReaction;
    if (!r || r.id === lastReactionId.current) return;
    lastReactionId.current = r.id;
    setReactionsByPlayer((prev) => ({ ...prev, [r.playerId]: r }));
    const t = window.setTimeout(() => {
      setReactionsByPlayer((prev) => {
        if (prev[r.playerId]?.id !== r.id) return prev;
        const copy = { ...prev };
        delete copy[r.playerId];
        return copy;
      });
    }, 2400);
    return () => window.clearTimeout(t);
  }, [room.botReaction]);

  // Synchronized reveal-stage bot reactions — ONLY fired on the "result" beat so hole card is never spoiled!
  useEffect(() => {
    if (!state || state.phase !== "reveal" || play.stage !== "result") return;
    const rKey = `${state.handNumber}-${state.dealsThisHand}`;
    if (revealReactKey.current === rKey) return;
    revealReactKey.current = rKey;

    const list = botRevealReactions(state);
    if (list.length === 0) return;
    setReactionsByPlayer((prev) => {
      const next = { ...prev };
      for (const item of list) next[item.playerId] = item;
      return next;
    });
    const t = window.setTimeout(() => {
      setReactionsByPlayer((prev) => {
        const next = { ...prev };
        for (const item of list) {
          if (next[item.playerId]?.id === item.id) delete next[item.playerId];
        }
        return next;
      });
    }, 2600);
    return () => window.clearTimeout(t);
  }, [state, play.stage]);

  // Keyboard shortcuts during your playing turn (H/S/D/P/R).
  useEffect(() => {
    if (!yourTurn || !state || state.phase !== "awaiting" || lockedTurn === turnKey) return;
    const legal = state.legalActions;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "h" && legal.includes("hit")) {
        e.preventDefault();
        act({ type: "hit" });
      } else if (k === "s" && legal.includes("stand")) {
        e.preventDefault();
        act({ type: "stand" });
      } else if (k === "d" && legal.includes("double")) {
        e.preventDefault();
        act({ type: "double" });
      } else if (k === "p" && legal.includes("split")) {
        e.preventDefault();
        act({ type: "split" });
      } else if (k === "r" && legal.includes("surrender")) {
        e.preventDefault();
        act({ type: "surrender" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourTurn, state?.phase, turnKey, lockedTurn]);

  const roundKey = `${state?.handNumber ?? 0}-${state?.dealsThisHand ?? 0}`;
  const maxRounds = state?.config.roundsUntilSettle ?? DEFAULT_CONFIG.roundsUntilSettle;
  const dealer = state?.dealer;
  const dealerCards = dealer?.cards ?? [];
  const seatCount = Math.max(1, room.seatCount ?? seats.length ?? DEFAULT_CONFIG.seatCount);
  const occupied = room.seats.length;
  const deckCount = state?.config.deckCount ?? decksForSeats(seatCount);
  const deckTotal = state?.deckTotal ?? deckCount * CARDS_PER_DECK;
  const deckRemaining = state?.deckRemaining ?? deckTotal;
  const shoePct = deckTotal > 0 ? Math.max(4, Math.min(100, Math.round((deckRemaining / deckTotal) * 100))) : 100;

  const showRevealOutcomes =
    state?.phase === "reveal" &&
    (play.stage === "result" || play.stage === "payout" || play.stage === "done");

  const dealerRevealedNow = Boolean(
    dealer &&
      dealer.cards.length > 0 &&
      ((state?.phase === "reveal" && play.showDealerHole) || (!dealer.hidden && state?.phase !== "reveal")),
  );

  const dealerBadgeText = dealerRevealedNow
    ? `${DEALER_NAME} · ${handLabel(dealerCards)}`
    : dealerCards[0]
      ? `${DEALER_NAME} · 明牌 ${rankLabel(dealerCards[0].rank)}`
      : DEALER_NAME;

  const dealerBadgeTone = dealerRevealedNow
    ? dealer?.blackjack
      ? "bj"
      : dealer?.bust
        ? "bust"
        : "neutral"
    : "neutral";

  function act(action: PlayerAction) {
    setLockedTurn(turnKey);
    onAction(action);
  }

  function copyCode() {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(room.code).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      });
    }
  }

  return (
    <div className="table-page">
      <header className="topbar">
        <div className="top-brand">
          <span className="mini-mark" aria-hidden="true">
            21
          </span>
          <strong>21点</strong>
          {state ? (
            <span className="meta-pill">
              第 {state.handNumber} 盘 · {Math.min(state.dealsThisHand + (state.phase === "reveal" ? 0 : 1), maxRounds)}/{maxRounds} 局
            </span>
          ) : (
            <span className="meta-pill">
              等待入座 · {occupied}/{seatCount}
            </span>
          )}
          <span className="shoe-pill" title={`牌靴余牌 ${deckRemaining}/${deckTotal}（${deckCount} 副牌）`}>
            <span className="shoe-label">{deckCount}副</span>
            <span className="shoe-track" aria-hidden="true">
              <span className="shoe-fill" style={{ width: `${shoePct}%` }} />
            </span>
            <span className="shoe-count">{deckRemaining}</span>
          </span>
        </div>

        <div className="top-center">
          <div className={`status-pill ${yourTurn ? "is-your-turn" : ""}`}>
            <span className="status-dot" aria-hidden="true" />
            <span>{error || play.status}</span>
            {showTurnClock ? (
              <span className={`timer ${remain !== null && remain <= 6 ? "urgent" : ""}`}>{remain}s</span>
            ) : null}
          </div>
        </div>

        <div className="top-right">
          <button
            className={`icon-btn sound-btn ${sound ? "on" : "off"}`}
            type="button"
            aria-pressed={sound}
            aria-label={sound ? "关闭音效" : "开启音效"}
            title={sound ? "音效已开启" : "音效已关闭"}
            onClick={() => {
              const next = !sound;
              setSoundOn(next);
              setSound(next);
              if (next) void unlockSound();
            }}
          >
            <SoundIcon on={sound} />
            <span className="btn-label">{sound ? "音效" : "静音"}</span>
          </button>
          <button className="icon-btn" type="button" onClick={onOpenRules}>
            规则
          </button>
          <button
            className="code-pill"
            type="button"
            title="点击复制房间码"
            onClick={copyCode}
          >
            {copied ? "已复制" : room.code}
          </button>
          <button className="icon-btn leave-btn" type="button" onClick={onLeave}>
            离开
          </button>
        </div>
      </header>

      <div className="felt-wrap">
        <div className={`felt seats-${seatCount} ${play.stage === "wager" ? "posting" : ""}`}>
          <div className="felt-rail" aria-hidden="true" />
          <div className="felt-arc" aria-hidden="true" />
          <div className="felt-inscription" aria-hidden="true">
            黑杰克 1 赔 2 · 庄家 17 点停牌
          </div>

          <div className="board">
            <div className="dealer-zone">
              <div className={`dealer-label tone-${dealerBadgeTone}`}>{dealerBadgeText}</div>
              {dealerCards.length > 0 || dealer?.hidden ? (
                <div className="board-cards" key={roundKey}>
                  {dealerCards[0] ? (
                    <CardView key={cardKey(dealerCards[0])} card={dealerCards[0]} tilt={-3} draw delayMs={0} />
                  ) : null}
                  {dealer?.hidden || (state?.phase === "reveal" && !play.showDealerHole) ? (
                    <CardView key="dealer-hole" faceDown tilt={3} draw delayMs={80} />
                  ) : (
                    dealerCards.slice(1).map((card, i) => (
                      <CardView
                        key={cardKey(card)}
                        card={card}
                        tilt={i === 0 ? 3 : i % 2 === 1 ? -2.5 : 2.5}
                        flip={i === 0}
                        draw={i > 0}
                        delayMs={i === 0 ? 0 : 120 + (i - 1) * 110}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="waiting-copy">{room.started ? "请各位闲家下注" : "等待玩家入座"}</div>
              )}
            </div>

            <div className="pool" data-pool>
              <div className="chips" aria-hidden="true">
                <span className="pot-chip c1" />
                <span className="pot-chip c2" />
                <span className="pot-chip c3" />
              </div>
              <div className="pool-readout">
                <small>底池</small>
                <b>{formatTokens(play.pool)}</b>
                <span className="pool-unit">Tokens</span>
              </div>
            </div>

            {yourTurn && state?.phase === "awaiting" ? <HintBar hint={state.hint ?? null} /> : null}
          </div>

          {Array.from({ length: seatCount }, (_, index) => {
            const player = seats[index];
            const place = placeFor(youIndex, index, seatCount);
            if (!player) {
              return (
                <div key={`empty-${index}`} className={`seat seat-${place} empty`}>
                  <div className="capsule empty-capsule">空位</div>
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
                activeHandIndex={isCurrent ? state?.currentHandIndex : undefined}
                thinking={botThinking}
                cue={room.botCue?.playerId === player.id ? room.botCue : null}
                reaction={reactionsByPlayer[player.id] ?? null}
                showOutcomes={showRevealOutcomes}
                place={place}
                showCards={dealt}
                renameable={room.mode === "pvp" && player.id === room.you}
                onRename={onRename}
              />
            );
          })}

          <TableFx state={state} stage={play.stage} you={room.you} />
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
              分享房间码 <b>{room.code}</b>，或由 Bot 补齐到 {seatCount} 人
              {room.mode === "pvp" ? " · 点座位「改名」可换昵称" : ""}
            </p>
            <button className="btn primary" onClick={onFillBots}>
              {occupied >= seatCount ? "开始对局" : "补齐 Bot 开局"}
            </button>
          </div>
        ) : null}

        <div className={`ticker-row ${yourTurn || (!room.started && room.hostId === room.you) ? "" : "is-primary"}`}>
          <span className="ticker-latest">{play.logs.at(-1)?.text ?? play.status}</span>
          {play.logs.length > 1 ? (
            <button
              type="button"
              className={`ticker-toggle ${logsOpen ? "open" : ""}`}
              onClick={() => setLogsOpen((v) => !v)}
            >
              {logsOpen ? "收起记录" : `记录 (${play.logs.length})`}
            </button>
          ) : null}
          {logsOpen ? (
            <div className="log-popover" role="log" aria-live="off">
              {play.logs
                .slice(-12)
                .reverse()
                .map((line) => (
                  <div key={line.id} className={`log-item kind-${line.kind}`}>
                    {line.text}
                  </div>
                ))}
            </div>
          ) : null}
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
