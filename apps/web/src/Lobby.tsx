import { DEFAULT_CONFIG, formatTokens, MAX_SEATS, MIN_SEATS } from "@hotpot/engine";
import { useState } from "react";
import { SeatCountStepper } from "./SeatCountStepper";

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
    <div className="lobby">
      <header className="lobby-hero">
        <p className="eyebrow">
          开局 {formatTokens(DEFAULT_CONFIG.startingTokens)} · 最小 {formatTokens(DEFAULT_CONFIG.minBet)} · 最大{" "}
          {formatTokens(DEFAULT_CONFIG.maxBet)}
        </p>
        <h1>21点</h1>
        <p className="lede">闲家对庄家比点数。要牌、停牌、加倍、分牌，靠近 21 但不要爆。</p>
      </header>
      <section className="panel">
        <label>
          昵称
          <input value={name} maxLength={16} onChange={(e) => onName(e.target.value)} placeholder="你的名字，桌上会显示" />
        </label>
        <SeatCountStepper
          value={seatCount}
          min={MIN_SEATS}
          max={MAX_SEATS}
          disabled={busy}
          onChange={onSeatCount}
        />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn primary lg" disabled={busy} onClick={onPve}>
          人机开局
        </button>
        <div className="split">
          <button className="btn ghost" disabled={busy} onClick={onCreatePvp}>
            创建房间
          </button>
          <div className="join">
            <input
              value={code}
              maxLength={6}
              placeholder="房间码"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="btn" disabled={busy || code.length < 4} onClick={() => onJoin(code)}>
              加入
            </button>
          </div>
        </div>
        <button className="link" onClick={onOpenRules}>
          查看规则
        </button>
      </section>
    </div>
  );
}
