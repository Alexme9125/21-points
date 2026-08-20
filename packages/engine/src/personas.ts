export interface PlayStyle {
  /** Extra chance to stand a stiff hand that basic strategy would hit. */
  foldBelow: number;
  /** Typical share of the legal bet range. */
  sizeBias: number;
  /** Random wobble so they don't play like a script. */
  mood: number;
  /** Extra chance to chicken out of a hit. */
  scratch: number;
  /** Chance to double / max-bet / take a riskier line. */
  shove: number;
  thinkMin: number;
  thinkMax: number;
  /** Shown while they tank — flavor only, not an action trigger. */
  thinkLines: readonly string[];
}

export interface LlmPersona {
  id: string;
  name: string;
  initials: string;
  color: string;
  style: PlayStyle;
}

/** Table nicknames. `id` is an internal play-style key, not shown to players. */
export const LLM_PERSONAS: readonly LlmPersona[] = [
  {
    id: "claude",
    name: "Tibo",
    initials: "TB",
    color: "#D97757",
    style: {
      foldBelow: -0.38,
      sizeBias: 0.22,
      mood: 0.05,
      scratch: 0.22,
      shove: 0.12,
      thinkMin: 5600,
      thinkMax: 11200,
      thinkLines: ["先数点数…", "这手不太稳", "停还是要", "小一点吧"],
    },
  },
  {
    id: "gpt",
    name: "Linus",
    initials: "LI",
    color: "#10A37F",
    style: {
      foldBelow: -0.4,
      sizeBias: 0.26,
      mood: 0.045,
      scratch: 0.18,
      shove: 0.14,
      thinkMin: 5400,
      thinkMax: 10500,
      thinkLines: ["算一下…", "庄家牌一般", "控制一下", "再确认"],
    },
  },
  {
    id: "kimi",
    name: "Aqua",
    initials: "AQ",
    color: "#1A1A1A",
    style: {
      foldBelow: -0.36,
      sizeBias: 0.2,
      mood: 0.04,
      scratch: 0.28,
      shove: 0.08,
      thinkMin: 6000,
      thinkMax: 11600,
      thinkLines: ["慢慢看…", "别爆", "保守一点", "先停"],
    },
  },
  {
    id: "glm",
    name: "Alice",
    initials: "AL",
    color: "#1A73E8",
    style: {
      foldBelow: -0.46,
      sizeBias: 0.36,
      mood: 0.045,
      scratch: 0.12,
      shove: 0.28,
      thinkMin: 4800,
      thinkMax: 9400,
      thinkLines: ["掂量一下", "中规中矩", "可以要", "下多少呢"],
    },
  },
  {
    id: "qwen",
    name: "Seth",
    initials: "SE",
    color: "#615CED",
    style: {
      foldBelow: -0.48,
      sizeBias: 0.4,
      mood: 0.05,
      scratch: 0.1,
      shove: 0.32,
      thinkMin: 4500,
      thinkMax: 8800,
      thinkLines: ["看牌", "点数还行", "跟一手", "别贪太多"],
    },
  },
  {
    id: "grok",
    name: "Nori",
    initials: "NO",
    color: "#1D1D1F",
    style: {
      foldBelow: -0.54,
      sizeBias: 0.52,
      mood: 0.1,
      scratch: 0.08,
      shove: 0.58,
      thinkMin: 4000,
      thinkMax: 8400,
      thinkLines: ["有意思", "搏一把？", "加倍试试", "再要一张"],
    },
  },
  {
    id: "gemini",
    name: "Milo",
    initials: "MI",
    color: "#8E83F3",
    style: {
      foldBelow: -0.56,
      sizeBias: 0.62,
      mood: 0.05,
      scratch: 0.05,
      shove: 0.64,
      thinkMin: 3800,
      thinkMax: 8000,
      thinkLines: ["能要就要", "这把有空间", "多下一点", "打满一点"],
    },
  },
  {
    id: "deepseek",
    name: "Vera",
    initials: "VE",
    color: "#4D6BFE",
    style: {
      foldBelow: -0.58,
      sizeBias: 0.7,
      mood: 0.045,
      scratch: 0.04,
      shove: 0.72,
      thinkMin: 3600,
      thinkMax: 7600,
      thinkLines: ["往里塞", "别让筹码闲着", "加倍", "跟到底"],
    },
  },
  {
    id: "minimax",
    name: "Juno",
    initials: "JU",
    color: "#7C5CFF",
    style: {
      foldBelow: -0.55,
      sizeBias: 0.58,
      mood: 0.06,
      scratch: 0.06,
      shove: 0.55,
      thinkMin: 4000,
      thinkMax: 8200,
      thinkLines: ["冲一下", "感觉不错", "多下点", "21点啊"],
    },
  },
] as const;

export const DEFAULT_THINK_LINES = ["看牌…", "要不要", "停还是要"] as const;

export function personaById(id: string): LlmPersona | undefined {
  return LLM_PERSONAS.find((p) => p.id === id);
}

export function styleForPersona(id: string | undefined): PlayStyle {
  return (
    personaById(id ?? "")?.style ?? {
      foldBelow: -0.46,
      sizeBias: 0.38,
      mood: 0.05,
      scratch: 0.1,
      shove: 0.3,
      thinkMin: 4500,
      thinkMax: 8600,
      thinkLines: DEFAULT_THINK_LINES,
    }
  );
}
