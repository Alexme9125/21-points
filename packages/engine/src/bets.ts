import type { BetRange } from "./types.js";

export function clampBet(amount: number, min: number, max: number, step = min): number {
  if (!(max >= min) || min <= 0) return Math.max(0, min);
  const unit = step > 0 ? step : min;
  const snapped = Math.round(amount / unit) * unit;
  return Math.min(max, Math.max(min, snapped));
}

export function isLegalBetAmount(amount: number, range: BetRange, step = range.min): boolean {
  if (!Number.isFinite(amount) || amount < range.min || amount > range.max) return false;
  if (amount === range.min || amount === range.max) return true;
  return step > 0 && amount % step === 0;
}

/** Classic 1–2–5–10 chip ladder from the table minimum, plus the current max. */
export function betChipAmounts(min: number, max: number, step = min): number[] {
  if (max < min || min <= 0) return [];
  const wanted = [1, 2, 5, 10].map((n) => min * n);
  const amounts = wanted.filter((a) => a <= max).map((a) => clampBet(a, min, max, step));
  amounts.push(clampBet(max, min, max, step));
  return [...new Set(amounts)].sort((a, b) => a - b);
}

export function repeatBetAmount(
  lastBet: number | null | undefined,
  range: BetRange,
  step = range.min,
): number | null {
  if (!lastBet || lastBet <= 0) return null;
  return clampBet(lastBet, range.min, range.max, step);
}

export function doubleLastBetAmount(
  lastBet: number | null | undefined,
  range: BetRange,
  step = range.min,
): number | null {
  const same = repeatBetAmount(lastBet, range, step);
  if (same == null || !lastBet) return null;
  const doubled = clampBet(lastBet * 2, range.min, range.max, step);
  return doubled === same ? null : doubled;
}

/** Accepts `3000`, `3K`, or `3.5k`. */
export function parseBetInput(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "").replace(/，/g, "").replace(/\s/g, "").toUpperCase();
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)([KM])?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mul = m[2] === "M" ? 1_000_000 : m[2] === "K" ? 1_000 : 1;
  return Math.round(n * mul);
}

export function formatBetDraft(amount: number): string {
  if (amount >= 1_000_000 && amount % 1_000_000 === 0) return `${amount / 1_000_000}M`;
  if (amount >= 1000 && amount % 1000 === 0) return `${amount / 1000}K`;
  return String(amount);
}
