import { type HandHint } from "@hotpot/engine";

export function HintBar({ hint }: { hint: HandHint | null }) {
  if (!hint) return null;
  return (
    <div className="hint">
      <span className="hint-full">{hint.label}</span>
      <span className="hint-short">{hint.label}</span>
    </div>
  );
}
