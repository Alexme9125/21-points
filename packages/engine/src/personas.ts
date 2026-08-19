export interface PlayStyle {
  /** Fold when per-token EV is below this. Higher means more cautious. */
  foldBelow: number;
  /** Typical share of the legal add range, before EV scaling. */
  sizeBias: number;
  /** Random wobble on the fold line so they don't play like a script. */
  mood: number;
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

export const LLM_PERSONAS: readonly LlmPersona[] = [
  {
    id: "claude",
    name: "Claude",
    initials: "CL",
    color: "#D97757",
    style: {
      foldBelow: 0.08,
      sizeBias: 0.2,
      mood: 0.03,
      thinkMin: 7200,
      thinkMax: 14000,
      thinkLines: ["先看区间…", "这点不太稳", "小一点吧", "过掉也行"],
    },
  },
  {
    id: "gpt",
    name: "GPT",
    initials: "GPT",
    color: "#10A37F",
    style: {
      foldBelow: 0.07,
      sizeBias: 0.22,
      mood: 0.035,
      thinkMin: 7000,
      thinkMax: 13200,
      thinkLines: ["算一下期望…", "赔率一般", "控制一下", "再确认"],
    },
  },
  {
    id: "kimi",
    name: "Kimi",
    initials: "KI",
    color: "#1A1A1A",
    style: {
      foldBelow: 0.09,
      sizeBias: 0.18,
      mood: 0.025,
      thinkMin: 7800,
      thinkMax: 14500,
      thinkLines: ["慢慢看…", "空间不够", "保守一点", "先放过"],
    },
  },
  {
    id: "glm",
    name: "GLM",
    initials: "GLM",
    color: "#1A73E8",
    style: {
      foldBelow: 0.04,
      sizeBias: 0.3,
      mood: 0.04,
      thinkMin: 6200,
      thinkMax: 11800,
      thinkLines: ["掂量一下", "中规中矩", "可以试", "下多少呢"],
    },
  },
  {
    id: "qwen",
    name: "Qwen",
    initials: "QW",
    color: "#615CED",
    style: {
      foldBelow: 0.03,
      sizeBias: 0.34,
      mood: 0.05,
      thinkMin: 5800,
      thinkMax: 11200,
      thinkLines: ["看牌", "区间还行", "跟一手", "别贪太多"],
    },
  },
  {
    id: "grok",
    name: "Grok",
    initials: "GR",
    color: "#1D1D1F",
    style: {
      foldBelow: 0,
      sizeBias: 0.48,
      mood: 0.1,
      thinkMin: 5200,
      thinkMax: 10800,
      thinkLines: ["有意思", "搏一把？", "许愿池挺肥", "试试运气"],
    },
  },
  {
    id: "gemini",
    name: "Gemini",
    initials: "GE",
    color: "#8E83F3",
    style: {
      foldBelow: -0.025,
      sizeBias: 0.58,
      mood: 0.05,
      thinkMin: 5000,
      thinkMax: 10200,
      thinkLines: ["能吃就吃", "这把有空间", "多添一点", "打满一点"],
    },
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    initials: "DS",
    color: "#4D6BFE",
    style: {
      foldBelow: -0.035,
      sizeBias: 0.64,
      mood: 0.045,
      thinkMin: 4800,
      thinkMax: 9800,
      thinkLines: ["往里塞", "别让池子闲着", "加大", "跟到底"],
    },
  },
  {
    id: "minimax",
    name: "MiniMax",
    initials: "MM",
    color: "#7C5CFF",
    style: {
      foldBelow: -0.015,
      sizeBias: 0.55,
      mood: 0.06,
      thinkMin: 5200,
      thinkMax: 10400,
      thinkLines: ["冲一下", "感觉不错", "添多点", "吃火锅啊"],
    },
  },
] as const;

export const DEFAULT_THINK_LINES = ["看牌…", "估一把", "要不要添"] as const;

export function personaById(id: string): LlmPersona | undefined {
  return LLM_PERSONAS.find((p) => p.id === id);
}

export function styleForPersona(id: string | undefined): PlayStyle {
  return (
    personaById(id ?? "")?.style ?? {
      foldBelow: 0.03,
      sizeBias: 0.35,
      mood: 0.04,
      thinkMin: 6000,
      thinkMax: 11000,
      thinkLines: DEFAULT_THINK_LINES,
    }
  );
}
