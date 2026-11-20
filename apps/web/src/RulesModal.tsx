import { DEFAULT_CONFIG, formatTokens } from "@hotpot/engine";

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="rules-title">21点规则</h2>
          <p className="muted">1 至 6 名闲家对阵一名庄家，手牌点数更接近 21 且不爆牌即胜。</p>
        </div>

        <div className="rules-metrics">
          <div className="metric-box">
            <span>初始筹码</span>
            <b>{formatTokens(DEFAULT_CONFIG.startingTokens)} Tokens</b>
          </div>
          <div className="metric-box">
            <span>单局限注</span>
            <b>
              {formatTokens(DEFAULT_CONFIG.minBet)}–{formatTokens(DEFAULT_CONFIG.maxBet)} Tokens
            </b>
          </div>
          <div className="metric-box">
            <span>黑杰克赔率</span>
            <b>1 赔 2</b>
          </div>
          <div className="metric-box">
            <span>结算周期</span>
            <b>每 {DEFAULT_CONFIG.roundsUntilSettle} 局</b>
          </div>
        </div>

        <ul className="rules">
          <li>
            <b>牌面计点</b>：2–10 按牌面计点，J / Q / K 计 10 点，A 可计 1 点或 11 点（如 A+8 为软 19）。
          </li>
          <li>
            <b>牌靴配置</b>：1 人用 1 副牌，2–3 人用 2 副，4–5 人用 4 副，6 人用 6 副；余牌低于四分之一时自动洗牌。
          </li>
          <li>
            <b>行动选择</b>：要牌（H）继续补牌，停牌（S）保留当前点数；超过 21 点即爆牌，立刻输掉本手赌注。
          </li>
          <li>
            <b>加倍与分牌</b>：首两张非黑杰克可加倍（D，补押同额且仅补一张）；同牌面对子可分牌（P）为两手独立结算（A 分牌各只补一张，分牌凑成 21 按 1 赔 1）。
          </li>
          <li>
            <b>投降与庄家</b>：庄家明牌非 A 时首两张可投降（R）收回一半赌注。庄家 16 点及以下必须要牌，17 点及以上（含软 17）停牌；不设保险。
          </li>
        </ul>

        <div className="row">
          <button className="btn primary" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
