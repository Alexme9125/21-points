export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay">
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <h2 id="rules-title">怎么玩</h2>
        <p className="muted">四人桌。中央的「许愿池」是大家一起投进去的 Tokens。</p>
        <ul className="rules">
          <li>开盘每人先向许愿池投入 <b>50K 底注</b>，手里还剩 450K。</li>
          <li>轮到谁，亮谁的两张底牌（上家的牌会留着对照）。</li>
          <li>可以放弃，或把一笔「添菜」押进许愿池，再发第三张。</li>
          <li>
            第三张<strong>夹在两点数中间</strong>：从许愿池赢回等额（爽吃）。
          </li>
          <li>夹不中：这笔添菜留在许愿池（挨饿）。</li>
          <li>连张（相邻点数）系统自动放弃。A 最小、K 最大，A 和 K 不是连张。</li>
          <li>第三张与其中一张同点是牛角尖，扣 2 倍；底牌是 A+K 则扣 4 倍。</li>
          <li>两张同点只能下最小添菜。再开出同点通吃许愿池，否则只扣最小添菜。</li>
          <li>许愿池被赢空则本盘结束；满 40 次发牌，摊掉池里一半。</li>
        </ul>
        <button className="btn primary" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}
