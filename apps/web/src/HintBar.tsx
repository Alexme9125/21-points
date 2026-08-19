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
  return (
    <div className="hint">
      <span>能赢</span>
      {hint.winRanks.map((r) => chip(r, "win"))}
      <span>牛角尖</span>
      {hint.hornRanks.map((r) => chip(r, "horn"))}
    </div>
  );
}
