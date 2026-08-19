import { DEFAULT_CONFIG, formatTokens } from "@hotpot/engine";
import { useState } from "react";

export function Lobby({
  name,
  onName,
  busy,
  error,
  onPve,
  onCreatePvp,
  onJoin,
  onOpenRules,
}: {
  name: string;
  onName: (v: string) => void;
  busy: boolean;
  error: string;
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
          底注 {formatTokens(DEFAULT_CONFIG.ante)}/人 · 最小添菜 {formatTokens(DEFAULT_CONFIG.minAdd)}
        </p>
        <h1>吃火锅</h1>
        <p className="lede">把筹码投进许愿池。区间内吃进，牛角尖加倍，三张通吃。</p>
      </header>
      <section className="panel">
        <label>
          昵称
          <input value={name} maxLength={16} onChange={(e) => onName(e.target.value)} placeholder="你的名字，桌上会显示" />
        </label>
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
