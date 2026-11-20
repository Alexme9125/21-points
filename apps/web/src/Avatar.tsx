import { initialsFromName, personaById, type BotMood } from "@hotpot/engine";

function Mark({ id }: { id: string }) {
  switch (id) {
    /* Tibo — Precision Compass Rose */
    case "claude":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
          <path
            d="M18 8.5 L20.2 15.8 L27.5 18 L20.2 20.2 L18 27.5 L15.8 20.2 L8.5 18 L15.8 15.8 Z"
            fill="currentColor"
          />
          <path
            d="M11.6 11.6 L16.4 16.4 M24.4 11.6 L19.6 16.4 M24.4 24.4 L19.6 19.6 M11.6 24.4 L16.4 19.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.52"
          />
          <circle cx="18" cy="18" r="2" fill="#B85D43" />
        </svg>
      );

    /* Linus — Scholar Owl */
    case "gpt":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M10.5 12.2 L13.8 10.2 C15.1 9.6 16.5 9.4 18 9.4 C19.5 9.4 20.9 9.6 22.2 10.2 L25.5 12.2 L24.6 14.8 C25.9 16.2 26.6 18 26.6 20 C26.6 24.4 22.8 27.2 18 27.2 C13.2 27.2 9.4 24.4 9.4 20 C9.4 18 10.1 16.2 11.4 14.8 Z"
            fill="currentColor"
            opacity="0.28"
          />
          <circle cx="13.8" cy="17.8" r="4.1" fill="currentColor" />
          <circle cx="22.2" cy="17.8" r="4.1" fill="currentColor" />
          <circle cx="13.8" cy="17.8" r="1.7" fill="#1B7A62" />
          <circle cx="22.2" cy="17.8" r="1.7" fill="#1B7A62" />
          <circle cx="14.5" cy="17.1" r="0.65" fill="currentColor" />
          <circle cx="22.9" cy="17.1" r="0.65" fill="currentColor" />
          <path d="M16.2 21.4 L18 24.2 L19.8 21.4 Z" fill="currentColor" />
          <path d="M10.6 12.3 L14.2 13.8 M25.4 12.3 L21.8 13.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );

    /* Aqua — Crescent Moon & Calm Waves */
    case "kimi":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M17.2 8.2 A6.8 6.8 0 1 0 23 18.8 A5.5 5.5 0 1 1 17.2 8.2 Z"
            fill="currentColor"
          />
          <path
            d="M24.2 10 L24.9 11.7 L26.6 12.4 L24.9 13.1 L24.2 14.8 L23.5 13.1 L21.8 12.4 L23.5 11.7 Z"
            fill="currentColor"
            opacity="0.82"
          />
          <path
            d="M8.5 23.2 Q11.8 20.8 15 23.2 T21.5 23.2 T27.5 23.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M10.5 26.8 Q13.3 25 16 26.8 T21.5 26.8 T25.8 26.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      );

    /* Alice — Origami Swallow in Flight */
    case "glm":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path d="M8 21.5 L16.2 17.2 L26.8 11 L20.5 21.8 L15.4 20.8 Z" fill="currentColor" />
          <path d="M11.2 11.5 L18.5 15.8 L15.2 18.2 Z" fill="currentColor" opacity="0.58" />
          <path d="M15.4 20.8 L11.4 26.2 L18.2 22.8 L22.5 25.4 L20.5 21.8 Z" fill="currentColor" opacity="0.72" />
          <circle cx="22.8" cy="14.4" r="0.9" fill="#2C63B8" />
        </svg>
      );

    /* Seth — Alert Geometric Fox */
    case "qwen":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M10.2 9.2 L15.2 13.8 H20.8 L25.8 9.2 L26.4 18.8 L18 27.2 L9.6 18.8 Z"
            fill="currentColor"
          />
          <path d="M11.8 12.2 L14.4 14.5 L11.5 16.2 Z" fill="#574FB8" opacity="0.55" />
          <path d="M24.2 12.2 L21.6 14.5 L24.5 16.2 Z" fill="#574FB8" opacity="0.55" />
          <path d="M10.5 19 L14.8 21.2 L18 26.4 L21.2 21.2 L25.5 19 L18 27.2 Z" fill="#574FB8" opacity="0.24" />
          <path d="M13.3 18.2 L15.7 19.1 M22.7 18.2 L20.3 19.1" stroke="#574FB8" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="18" cy="24.2" r="1.45" fill="#574FB8" />
        </svg>
      );

    /* Nori — Lucky Tilted Die & Spark */
    case "grok":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <g transform="rotate(-11 17 19)">
            <rect x="9.5" y="11.5" width="15" height="15" rx="3.4" fill="currentColor" />
            <circle cx="13.5" cy="15.5" r="1.35" fill="#2C3531" />
            <circle cx="20.5" cy="15.5" r="1.35" fill="#2C3531" />
            <circle cx="17" cy="19" r="1.45" fill="#2C3531" />
            <circle cx="13.5" cy="22.5" r="1.35" fill="#2C3531" />
            <circle cx="20.5" cy="22.5" r="1.35" fill="#2C3531" />
          </g>
          <path
            d="M26 7.5 L26.9 10.1 L29.5 11 L26.9 11.9 L26 14.5 L25.1 11.9 L22.5 11 L25.1 10.1 Z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      );

    /* Milo — Twin Peaks & Rising Sun */
    case "gemini":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="22.5" cy="12.2" r="3.4" fill="currentColor" opacity="0.88" />
          <path d="M14.5 25 L22.2 15.2 L28.5 25 Z" fill="currentColor" opacity="0.46" />
          <path d="M7.5 25 L15.6 12.6 L23.8 25 Z" fill="currentColor" />
          <path d="M13.5 15.8 L15.6 12.6 L17.7 15.8 L15.6 14.8 Z" fill="#7358B5" opacity="0.35" />
        </svg>
      );

    /* Vera — Architectural Highroller Crown */
    case "deepseek":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M8.5 23.2 L10.2 13.4 L14.8 17.6 L18 11 L21.2 17.6 L25.8 13.4 L27.5 23.2 Z"
            fill="currentColor"
          />
          <rect x="9.2" y="24.8" width="17.6" height="2.6" rx="1.3" fill="currentColor" opacity="0.65" />
          <circle cx="10.2" cy="11.5" r="1.4" fill="currentColor" />
          <circle cx="18" cy="9.2" r="1.6" fill="currentColor" />
          <circle cx="25.8" cy="11.5" r="1.4" fill="currentColor" />
        </svg>
      );

    /* Juno — Expressive Whiskered Cat */
    case "minimax":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M10.4 10.2 L14.8 13.6 C15.8 13.3 16.9 13.1 18 13.1 C19.1 13.1 20.2 13.3 21.2 13.6 L25.6 10.2 L26.2 18.8 C26.2 23.8 22.6 26.8 18 26.8 C13.4 26.8 9.8 23.8 9.8 18.8 Z"
            fill="currentColor"
          />
          <path d="M13.2 19.6 Q14.6 17.6 16 19.6" fill="none" stroke="#A83E63" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M20 19.6 Q21.4 17.6 22.8 19.6" fill="none" stroke="#A83E63" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M16.9 21.7 L18 23 L19.1 21.7 Z" fill="#A83E63" />
          <path
            d="M7.2 20.2 H10.2 M7.5 22.6 L10.4 22.1 M28.8 20.2 H25.8 M28.5 22.6 L25.6 22.1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      );

    /* Logan — Lone Timber Wolf */
    case "logan":
      return (
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <path
            d="M11 8.8 L14.8 13 L18 12.2 L21.2 13 L25 8.8 L25.5 16.2 L27.2 19.6 L23.8 22.2 L21 26.6 L18 28 L15 26.6 L12.2 22.2 L8.8 19.6 L10.5 16.2 Z"
            fill="currentColor"
          />
          <path
            d="M14.5 14.5 L18 17.2 L21.5 14.5 L19.8 21.4 L18 23.4 L16.2 21.4 Z"
            fill="#7A5938"
            opacity="0.28"
          />
          <path d="M13 17.8 L15.6 18.5 M23 17.8 L20.4 18.5" stroke="#7A5938" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M16.4 23.6 H19.6 L18 25.5 Z" fill="#7A5938" />
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
  mood,
}: {
  name: string;
  personaId?: string;
  you?: boolean;
  mood?: BotMood;
}) {
  const persona = personaId ? personaById(personaId) : undefined;
  const color = you ? "#135036" : (persona?.color ?? "#4A5952");
  const title = persona ? `${name} · ${persona.style.tagline}` : name;

  return (
    <div
      className={`avatar ${mood === "hot" ? "avatar-hot" : ""} ${persona ? "avatar-bot" : ""}`}
      style={{
        background: `radial-gradient(circle at 30% 24%, color-mix(in srgb, ${color} 80%, #ffffff), ${color} 68%)`,
        color: "#FCFBF7",
      }}
      title={title}
    >
      {persona ? <Mark id={persona.id} /> : <span>{initialsFromName(name)}</span>}
    </div>
  );
}
