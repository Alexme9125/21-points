import type { OutcomeKind } from "@hotpot/engine";

const SOUND_KEY = "hotpot.sound";

let ctx: AudioContext | null = null;
let enabled = true;

function readEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

enabled = typeof localStorage === "undefined" ? true : readEnabled();

export function isSoundOn(): boolean {
  return enabled;
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (on) void unlockSound();
}

export async function unlockSound(): Promise<void> {
  if (typeof window === "undefined") return;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* autoplay still blocked */
    }
  }
}

function beep(
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slideTo?: number,
): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), when + dur);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sine" ? 4200 : 1800, when);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.018);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.03);
}

export function playOutcome(kind: OutcomeKind): void {
  if (!enabled) return;
  void (async () => {
    await unlockSound();
    if (!enabled || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.02;
    if (kind === "win") {
      beep(523, t, 0.11, "sine", 0.09);
      beep(659, t + 0.08, 0.12, "sine", 0.1);
      beep(784, t + 0.16, 0.18, "triangle", 0.08);
      return;
    }
    if (kind === "triple_win") {
      beep(523, t, 0.1, "sine", 0.09);
      beep(659, t + 0.07, 0.1, "sine", 0.1);
      beep(784, t + 0.14, 0.1, "triangle", 0.1);
      beep(1046, t + 0.22, 0.22, "sine", 0.08);
      return;
    }
    if (kind === "lose" || kind === "triple_lose") {
      beep(196, t, 0.16, "triangle", 0.08, 140);
      beep(147, t + 0.12, 0.22, "sine", 0.07, 110);
      return;
    }
    if (kind === "horn") {
      beep(311, t, 0.12, "square", 0.05);
      beep(233, t + 0.08, 0.2, "square", 0.045, 170);
      return;
    }
  })();
}

export function playWager(): void {
  if (!enabled) return;
  void (async () => {
    await unlockSound();
    if (!enabled || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.01;
    beep(880, t, 0.05, "triangle", 0.04);
    beep(660, t + 0.05, 0.07, "sine", 0.035, 520);
  })();
}

export function armSoundUnlock(): void {
  if (typeof window === "undefined") return;
  const once = () => {
    void unlockSound();
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("keydown", once);
  };
  window.addEventListener("pointerdown", once);
  window.addEventListener("keydown", once);
}
