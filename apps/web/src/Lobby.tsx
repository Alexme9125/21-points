import { useState } from "react";
import { RulesModal } from "./RulesModal";

export function Lobby({
  name,
  onName,
  busy,
  error,
  onPve,
  onCreatePvp,
  onJoin,
}: {
  name: string;
  onName: (v: string) => void;
  busy: boolean;
  error: string;
  onPve: () => void;
  onCreatePvp: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [rules, setRules] = useState(false);

  return (
    <div className="lobby">
      <header className="lobby-hero">
        <p className="eyebrow">No-Limit · 5K / 10K Tokens</p>
        <h1>吃火锅</h1>
        <p className="lede">把筹码投进项目池。区间内吃进，牛角尖加倍，三张通吃。</p>
      </header>
      <section className="panel">
        <label>
          昵称
          <input value={name} maxLength={16} onChange={(e) => onName(e.target.value)} placeholder="你的名字" />
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
        <button className="link" onClick={() => setRules(true)}>
          查看规则
        </button>
      </section>
      <RulesModal open={rules} onClose={() => setRules(false)} />
    </div>
  );
}
