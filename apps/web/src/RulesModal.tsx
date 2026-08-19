export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>吃火锅规则</h2>
        <p className="muted">武汉棋牌玩法。桌上的「许愿池」就是原来的火锅底料，单位为 Tokens。</p>
        <ol className="rules">
          <li>四人同桌，52 张牌，点数 A&lt;2&lt;…&lt;K。轮到谁时亮谁的两张底牌，并保留上家的牌。</li>
          <li>开盘时每人向许愿池投入 50K 底注。按逆时针依次决策：放弃或添菜，思考时间 30 秒。</li>
          <li>添菜后发第三张。点数严格落在两张牌之间则从许愿池赢等额 Tokens，否则把添菜投入许愿池。</li>
          <li>连张（相邻点数）系统自动放弃。A 与 K 不是连张，区间最大。</li>
          <li>牛角尖：第三张与其中一张同点，扣 2 倍；若底牌是 A+K 则为超级牛角尖，扣 4 倍。</li>
          <li>三张：两张同点只能下最小添菜。再开出同点通吃许愿池，否则只扣最小添菜。</li>
          <li>四人各决策一次后重新洗牌。有人把许愿池赢空则本盘结束；满 40 次发牌则摊掉一半。</li>
        </ol>
        <button className="btn primary" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}
