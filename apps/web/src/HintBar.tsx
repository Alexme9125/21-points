import { hintSummary, rankLabel, type HoleHint, type Rank } from "@hotpot/engine";

export function HintBar({ hint }: { hint: HoleHint | null }) {
  if (!hint) return null;
  if (hint.kind === "consecutive") {
    return <div className="hint">连张：系统将自动放弃</div>;
  }
  if (hint.kind === "pair") {
    return <div className="hint">{hintSummary(hint)}</div>;
  }
  const chip = (rank: Rank, tone: string) => (
    <span key={`${tone}-${rank}`} className={`rank-chip ${tone}`}>
      {rankLabel(rank)}
    </span>
  );
  const winRange =
    hint.winRanks.length > 0
      ? `${rankLabel(hint.winRanks[0]!)}–${rankLabel(hint.winRanks[hint.winRanks.length - 1]!)}`
      : "无";
  const horns = hint.hornRanks.map(rankLabel).join("/");
  return (
    <div className="hint">
      <span className="hint-full">
        <span>能赢</span>
        {hint.winRanks.map((r) => chip(r, "win"))}
        <span>牛角尖</span>
        {hint.hornRanks.map((r) => chip(r, "horn"))}
      </span>
      <span className="hint-short">
        能赢 {winRange} · 牛角 {horns}
      </span>
    </div>
  );
}
