import type { PublicState } from "@hotpot/engine";

export interface Seat {
  id: string;
  name: string;
  kind: "human" | "bot";
  personaId?: string;
  connected: boolean;
}

export interface RoomSnapshot {
  type?: string;
  code: string;
  mode: "pve" | "pvp";
  hostId: string;
  started: boolean;
  you: string;
  seats: Seat[];
  state: PublicState | null;
  deadline: number | null;
  status: string;
  message?: string;
}

export interface Session {
  token: string;
  playerId: string;
  name: string;
}

const TOKEN_KEY = "hotpot.token";
const NAME_KEY = "hotpot.name";

export function savedName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export async function ensureSession(name: string): Promise<Session> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, token: localStorage.getItem(TOKEN_KEY) }),
  });
  if (!res.ok) throw new Error("无法建立会话");
  const data = (await res.json()) as Session;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(NAME_KEY, data.name);
  return data;
}

export async function fetchMe(): Promise<(Session & { room: RoomSnapshot | null }) | null> {
  const t = token();
  if (!t) return null;
  const res = await fetch(`/api/me?token=${encodeURIComponent(t)}`);
  if (!res.ok) return null;
  return (await res.json()) as Session & { room: RoomSnapshot | null };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "请求失败");
  return data as T;
}

export function createRoom(mode: "pve" | "pvp") {
  return post<RoomSnapshot>("/api/rooms", { token: token(), mode });
}

export function joinRoom(code: string) {
  return post<RoomSnapshot>(`/api/rooms/${code.trim().toUpperCase()}/join`, { token: token() });
}

export function leaveRoom() {
  return post<{ ok: boolean }>("/api/rooms/leave", { token: token() });
}

export function connectRoom(onMessage: (msg: RoomSnapshot) => void, onError: (msg: string) => void): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token())}`);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data)) as RoomSnapshot;
    if (msg.type === "error") onError(msg.message ?? "出错了");
    else onMessage(msg);
  };
  return ws;
}
