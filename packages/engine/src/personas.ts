export interface LlmPersona {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export const LLM_PERSONAS: readonly LlmPersona[] = [
  { id: "claude", name: "Claude", initials: "CL", color: "#D97757" },
  { id: "gpt", name: "GPT", initials: "GPT", color: "#10A37F" },
  { id: "gemini", name: "Gemini", initials: "GE", color: "#8E83F3" },
  { id: "grok", name: "Grok", initials: "GR", color: "#1D1D1F" },
  { id: "minimax", name: "MiniMax", initials: "MM", color: "#7C5CFF" },
  { id: "qwen", name: "Qwen", initials: "QW", color: "#615CED" },
  { id: "deepseek", name: "DeepSeek", initials: "DS", color: "#4D6BFE" },
  { id: "glm", name: "GLM", initials: "GLM", color: "#1A73E8" },
  { id: "kimi", name: "Kimi", initials: "KI", color: "#1A1A1A" },
] as const;

export function personaById(id: string): LlmPersona | undefined {
  return LLM_PERSONAS.find((p) => p.id === id);
}
