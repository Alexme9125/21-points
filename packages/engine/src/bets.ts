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
