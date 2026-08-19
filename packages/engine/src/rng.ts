/** Mulberry32 — deterministic, compact, good enough for a card table. */
export function nextRng(state: number): { value: number; rng: number } {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rng: t };
}

export function shuffleInPlace<T>(items: T[], rng: number): number {
  for (let i = items.length - 1; i > 0; i--) {
    const step = nextRng(rng);
    rng = step.rng;
    const j = Math.floor(step.value * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return rng;
}

export function pickN<T>(items: readonly T[], n: number, rng: number): { picked: T[]; rng: number } {
  const copy = [...items];
  rng = shuffleInPlace(copy, rng);
  return { picked: copy.slice(0, n), rng };
}
