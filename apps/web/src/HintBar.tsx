import type { HandHint } from "@hotpot/engine";

export function HintBar({ hint }: { hint: HandHint | null }) {
  if (!hint) return null;
  return <div className="hint-pill">{hint.label}</div>;
}
