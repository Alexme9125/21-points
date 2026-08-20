import { DEFAULT_CONFIG, formatTokens } from "@hotpot/engine";

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay">
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <h2 id="rules-title">怎么玩</h2>
        <p className="muted">1 到 6 名闲家对一名庄家。大厅或开局前可改人数。目标是点数尽量接近 21，但不能超过。</p>
        <ul className="rules">
          <li>
            牌靴按闲家人数自动选择：1 人 1 副，2–3 人 2 副，4–5 人 4 副，6 人 6 副。剩余不足约四分之一时重新洗牌。
          </li>
          <li>
            2–10 按点数，J/Q/K 算 10，A 可算 1 或 11。例如 A+8 是软 19，A+7+J 是 18。
          </li>
          <li>每人先下注，再发两张牌。庄家一张明牌、一张暗牌。</li>
          <li>
            开局 {formatTokens(DEFAULT_CONFIG.startingTokens)} Tokens。每局 {formatTokens(DEFAULT_CONFIG.minBet)}–
            {formatTokens(DEFAULT_CONFIG.maxBet)}
            ，快捷可点最小、2K、5K、最大或续注；也可拖滑条或输入金额再点下注。
          </li>
          <li>
            <b>要牌</b>继续拿牌；<b>停牌</b>不再拿。超过 21 即爆牌，立刻输掉这手。
          </li>
          <li>
            前两张可<b>加倍</b>（再下一份同额，只补一张）。同点对子可<b>分牌</b>成两手；分牌后的 21
            不算黑杰克，只按 1 赔 1。
          </li>
          <li>两张牌时若庄家明牌不是 A，可<b>投降</b>，收回一半赌注。</li>
          <li>前两张合计 21（A+10 点牌）是黑杰克，赔率 1 赔 2。普通赢局 1 赔 1，点数相同则平。</li>
          <li>庄家 16 及以下必须要牌，17 及以上停牌（含软 17）。闲家爆牌后，即使庄家也爆，仍算庄家赢。</li>
          <li>本桌不设保险。满 24 局后结算本盘盈亏。</li>
        </ul>
        <button className="btn primary" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}
