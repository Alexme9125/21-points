import { DEFAULT_CONFIG, formatTokens, MAX_SEATS, MIN_SEATS } from "@hotpot/engine";
import { useState } from "react";
import { SuitIcon } from "./CardView";
import { SeatCountStepper } from "./SeatCountStepper";

function BrandMark() {
  return (
    <div className="brand-emblem" aria-hidden="true">
      <div className="emblem-card emblem-card-back">
        <span className="emblem-rank red">10</span>
        <SuitIcon suit="hearts" className="emblem-suit red" />
      </div>
      <div className="emblem-card emblem-card-front">
        <span className="emblem-rank">A</span>
        <SuitIcon suit="spades" className="emblem-suit" />
      </div>
    </div>
  );
}

export function Lobby({
  name,
  onName,
  busy,
  error,
  seatCount,
  onSeatCount,
  onPve,
  onCreatePvp,
  onJoin,
  onOpenRules,
}: {
  name: string;
  onName: (v: string) => void;
  busy: boolean;
  error: string;
  seatCount: number;
  onSeatCount: (n: number) => void;
  onPve: () => void;
  onCreatePvp: () => void;
  onJoin: (code: string) => void;
  onOpenRules: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <main className="lobby">
      <div className="lobby-shell">
        <header className="lobby-hero">
          <BrandMark />
          <h1>21点</h1>
          <p className="lede">闲家对庄家比点数。要牌、停牌、加倍或分牌，逼近 21 而不爆牌。</p>
        </header>

        <section className="panel" aria-label="对局设置">
          <label className="field">
            <span className="field-label">牌桌昵称</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => onName(e.target.value)}
              placeholder="输入你的名字"
              autoComplete="nickname"
            />
          </label>

          <SeatCountStepper
            value={seatCount}
            min={MIN_SEATS}
            max={MAX_SEATS}
            disabled={busy}
            onChange={onSeatCount}
          />

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn primary lg" disabled={busy} onClick={onPve}>
            人机开局
          </button>

          <div className="divider">
            <span>好友联机</span>
          </div>

          <div className="pvp-row">
            <button className="btn ghost" disabled={busy} onClick={onCreatePvp}>
              创建房间
            </button>
            <form
              className="join"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && code.length >= 4) onJoin(code);
              }}
            >
              <input
                value={code}
                maxLength={6}
                placeholder="6位房间码"
                aria-label="房间码"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
              <button type="submit" className="btn subtle" disabled={busy || code.length < 4}>
                加入
              </button>
            </form>
          </div>
        </section>

        <footer className="lobby-meta">
          <span>
            初始 {formatTokens(DEFAULT_CONFIG.startingTokens)} Tokens，单局限注{" "}
            {formatTokens(DEFAULT_CONFIG.minBet)}–{formatTokens(DEFAULT_CONFIG.maxBet)}
          </span>
          <button type="button" className="link" onClick={onOpenRules}>
            牌桌规则
          </button>
        </footer>
      </div>
    </main>
  );
}
