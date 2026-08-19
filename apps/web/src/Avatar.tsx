import { initialsFromName, personaById } from "@hotpot/engine";

function Mark({ id }: { id: string }) {
  switch (id) {
    case "claude":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M16 4 L19 13 H28 L21 18 L24 28 L16 22 L8 28 L11 18 L4 13 H13 Z" fill="currentColor" />
        </svg>
      );
    case "gpt":
      return (
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="16" cy="7" r="2.2" fill="currentColor" />
          <circle cx="24" cy="20.5" r="2.2" fill="currentColor" />
          <circle cx="8" cy="20.5" r="2.2" fill="currentColor" />
        </svg>
      );
    case "gemini":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M16 3 L18.5 13.5 L29 16 L18.5 18.5 L16 29 L13.5 18.5 L3 16 L13.5 13.5 Z" fill="currentColor" />
        </svg>
      );
    case "grok":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M8 8 L24 24 M24 8 L8 24" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case "minimax":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M7 24 V10 L16 20 L25 10 V24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
        </svg>
      );
    case "qwen":
      return (
        <svg viewBox="0 0 32 32">
          <rect x="8" y="8" width="16" height="16" rx="3" transform="rotate(45 16 16)" fill="currentColor" />
        </svg>
      );
    case "deepseek":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M6 16 H18 M14 10 L22 16 L14 22" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "glm":
      return (
        <svg viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
          <path d="M16 7 V16 H23" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case "kimi":
      return (
        <svg viewBox="0 0 32 32">
          <path d="M20 8 A9 9 0 1 0 20 24 A7 7 0 1 1 20 8 Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export function Avatar({
  name,
  personaId,
  you,
}: {
  name: string;
  personaId?: string;
  you?: boolean;
}) {
  const persona = personaId ? personaById(personaId) : undefined;
  const color = you ? "#3b82f6" : (persona?.color ?? "#64748b");
  const light = you || ["grok", "kimi"].includes(personaId ?? "");
  return (
    <div className="avatar" style={{ background: color, color: light ? "#fff" : "#fff" }} title={name}>
      {persona ? <Mark id={persona.id} /> : <span>{initialsFromName(name)}</span>}
    </div>
  );
}
