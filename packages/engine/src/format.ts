export function formatTokens(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    return `${sign}${trimFloat(n)}M`;
  }
  if (abs >= 1000) {
    const n = abs / 1000;
    return `${sign}${trimFloat(n)}K`;
  }
  return `${sign}${abs}`;
}

function trimFloat(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "YOU";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
  }
  const alnum = trimmed.replace(/[^\p{L}\p{N}]/gu, "");
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}
