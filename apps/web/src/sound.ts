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

function tone(
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
  filter.frequency.setValueAtTime(type === "sine" ? 3600 : 1900, when);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(gain, when + 0.014);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.03);
}

function noiseBurst(when: number, dur: number, freq: number, q: number, gain: number): void {
  if (!ctx) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp((-i / len) * 3.8);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, when);
  filter.Q.setValueAtTime(q, when);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, when);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start(when);
}

/** Crisp papery linen card flick sound. */
export function playCardSlide(): void {
  if (!enabled) return;
  void (async () => {
    await unlockSound();
    if (!enabled || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.005;
    noiseBurst(t, 0.075, 2200, 1.4, 0.045);
    tone(240, t, 0.04, "sine", 0.018, 150);
  })();
}

/** Tactile ceramic poker chip clink. */
export function playWager(): void {
  if (!enabled) return;
  void (async () => {
    await unlockSound();
    if (!enabled || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.01;
    tone(2480, t, 0.045, "sine", 0.028, 2150);
    tone(3620, t + 0.004, 0.035, "triangle", 0.018, 3100);
    tone(2180, t + 0.055, 0.055, "sine", 0.024, 1840);
  })();
}

export function playOutcome(kind: OutcomeKind): void {
  if (!enabled) return;
  void (async () => {
    await unlockSound();
    if (!enabled || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + 0.02;
    if (kind === "win") {
      tone(523.25, t, 0.12, "sine", 0.065);
      tone(659.25, t + 0.07, 0.14, "sine", 0.07);
      tone(783.99, t + 0.14, 0.22, "triangle", 0.055);
      return;
    }
    if (kind === "blackjack") {
      tone(523.25, t, 0.11, "sine", 0.07);
      tone(659.25, t + 0.065, 0.11, "sine", 0.072);
      tone(783.99, t + 0.13, 0.13, "triangle", 0.065);
      tone(1046.5, t + 0.2, 0.28, "sine", 0.068);
      return;
    }
    if (kind === "lose" || kind === "bust") {
      tone(220, t, 0.15, "triangle", 0.05, 165);
      tone(164.8, t + 0.11, 0.22, "sine", 0.045, 130);
      return;
    }
    if (kind === "surrender") {
      tone(329.6, t, 0.11, "triangle", 0.04);
      tone(261.6, t + 0.08, 0.18, "sine", 0.035, 220);
      return;
    }
    if (kind === "push") {
      tone(440, t, 0.09, "sine", 0.038);
      tone(440, t + 0.095, 0.11, "triangle", 0.03);
    }
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
