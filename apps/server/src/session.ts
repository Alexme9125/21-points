import { randomBytes, randomUUID } from "node:crypto";

export interface Session {
  token: string;
  playerId: string;
  name: string;
  roomCode: string | null;
}

const sessions = new Map<string, Session>();

export function normalizeName(name: string): string {
  return name.trim().slice(0, 16) || "玩家";
}

export function createSession(name: string, existingToken?: string): Session {
  const trimmed = normalizeName(name);
  if (existingToken) {
    const found = sessions.get(existingToken);
    if (found) {
      found.name = trimmed;
      return found;
    }
  }
  const session: Session = {
    token: randomBytes(16).toString("hex"),
    playerId: randomUUID(),
    name: trimmed,
    roomCode: null,
  };
  sessions.set(session.token, session);
  return session;
}

export function getSession(token: string | undefined): Session | undefined {
  if (!token) return undefined;
  return sessions.get(token);
}

export function roomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}
