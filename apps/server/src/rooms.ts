import {
  advance,
  applyAction,
  botThinkMs,
  chooseBotAction,
  continueFromSettlement,
  createTable,
  currentPlayer,
  LLM_PERSONAS,
  pickN,
  startHand,
  toPublicState,
  type PlayerAction,
  type PublicState,
  type TableState,
} from "@hotpot/engine";
import type { WebSocket } from "ws";
import { roomCode, type Session } from "./session.js";

export interface Seat {
  id: string;
  name: string;
  kind: "human" | "bot";
  personaId?: string;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  mode: "pve" | "pvp";
  hostId: string;
  started: boolean;
  you: string;
  seats: Seat[];
  state: PublicState | null;
  deadline: number | null;
  status: string;
}

interface Room {
  code: string;
  mode: "pve" | "pvp";
  hostId: string;
  seats: Seat[];
  table: TableState | null;
  sockets: Map<string, Set<WebSocket>>;
  deadline: number | null;
  timers: {
    bot?: ReturnType<typeof setTimeout>;
    action?: ReturnType<typeof setTimeout>;
    advance?: ReturnType<typeof setTimeout>;
    settle?: ReturnType<typeof setTimeout>;
  };
  usedPersonas: Set<string>;
  rng: number;
}

const rooms = new Map<string, Room>();
const TURN_MS = 20_000;

function statusText(room: Room): string {
  if (!room.table) {
    const humans = room.seats.filter((s) => s.kind === "human").length;
    return `等待开局（${humans}/4）`;
  }
  const { table } = room;
  if (table.phase === "awaiting") {
    const p = currentPlayer(table);
    if (!p) return "等待行动";
    return p.kind === "bot" ? `${p.name} 思考中` : `轮到 ${p.name} 添菜`;
  }
  if (table.phase === "reveal") {
    const kind = table.outcome?.kind;
    if (kind === "consecutive") return "连张，自动放弃";
    if (kind === "horn") return "牛角尖！";
    if (kind === "triple_win") return "三张通吃！";
    if (kind === "win") return "吃进项目池";
    if (kind === "lose" || kind === "triple_lose") return "投入项目池";
    return "结算中";
  }
  if (table.phase === "settlement") return "本盘结束";
  if (table.phase === "gameover") return "对局结束";
  return "准备中";
}

function snapshot(room: Room, you: string): RoomSnapshot {
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    started: Boolean(room.table),
    you,
    seats: room.seats,
    state: room.table ? toPublicState(room.table) : null,
    deadline: room.deadline,
    status: statusText(room),
  };
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(room: Room): void {
  for (const [playerId, sockets] of room.sockets) {
    const payload = { type: "state", ...snapshot(room, playerId) };
    for (const ws of sockets) send(ws, payload);
  }
}

function clearTimers(room: Room): void {
  for (const key of Object.keys(room.timers) as (keyof Room["timers"])[]) {
    const t = room.timers[key];
    if (t) clearTimeout(t);
    room.timers[key] = undefined;
  }
  room.deadline = null;
}

function takePersonas(room: Room, n: number): typeof LLM_PERSONAS[number][] {
  const available = LLM_PERSONAS.filter((p) => !room.usedPersonas.has(p.id));
  const { picked, rng } = pickN(available, n, room.rng);
  room.rng = rng;
  for (const p of picked) room.usedPersonas.add(p.id);
  return picked;
}

function fillBots(room: Room): void {
  const missing = 4 - room.seats.length;
  if (missing <= 0) return;
  const personas = takePersonas(room, missing);
  for (const persona of personas) {
    room.seats.push({
      id: `bot:${persona.id}:${room.code}`,
      name: persona.name,
      kind: "bot",
      personaId: persona.id,
      connected: true,
    });
  }
}

function startTable(room: Room): void {
  fillBots(room);
  room.table = startHand(
    createTable(
      room.seats.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        personaId: s.personaId,
      })),
      undefined,
      room.rng,
    ),
  );
  if (hasHumanSocket(room)) schedule(room);
  broadcast(room);
}

function hasHumanSocket(room: Room): boolean {
  return room.seats.some((s) => s.kind === "human" && (room.sockets.get(s.id)?.size ?? 0) > 0);
}

function ensureLoop(room: Room): void {
  if (!room.table) return;
  if (room.timers.bot || room.timers.action || room.timers.advance || room.timers.settle) return;
  schedule(room);
}

function schedule(room: Room): void {
  clearTimers(room);
  const table = room.table;
  if (!table) return;

  if (table.phase === "awaiting") {
    const player = currentPlayer(table);
    if (!player) return;
    if (player.kind === "bot") {
      const think = botThinkMs(Math.random());
      room.timers.bot = setTimeout(() => {
        try {
          const action = chooseBotAction(room.table!);
          room.table = applyAction(room.table!, player.id, action);
          broadcast(room);
          schedule(room);
        } catch (err) {
          console.error(err);
        }
      }, think);
      broadcast(room);
      return;
    }
    const seat = room.seats.find((s) => s.id === player.id);
    if (seat && !seat.connected) {
      room.timers.action = setTimeout(() => autoFold(room, player.id), 8_000);
      room.deadline = Date.now() + 8_000;
      broadcast(room);
      return;
    }
    room.deadline = Date.now() + TURN_MS;
    room.timers.action = setTimeout(() => autoFold(room, player.id), TURN_MS);
    broadcast(room);
    return;
  }

  if (table.phase === "reveal") {
    const delay = table.outcome?.kind === "consecutive" || table.outcome?.kind === "fold" ? 1_150 : 1_850;
    room.timers.advance = setTimeout(() => {
      room.table = advance(room.table!);
      broadcast(room);
      schedule(room);
    }, delay);
    return;
  }

  if (table.phase === "settlement") {
    room.timers.settle = setTimeout(() => {
      room.table = continueFromSettlement(room.table!);
      broadcast(room);
      schedule(room);
    }, 9_000);
  }
}

function autoFold(room: Room, playerId: string): void {
  if (!room.table || room.table.phase !== "awaiting") return;
  const current = currentPlayer(room.table);
  if (!current || current.id !== playerId) return;
  try {
    room.table = applyAction(room.table, playerId, { type: "fold" });
    broadcast(room);
    schedule(room);
  } catch (err) {
    console.error(err);
  }
}

export function createRoom(session: Session, mode: "pve" | "pvp"): RoomSnapshot {
  if (session.roomCode && rooms.get(session.roomCode)) {
    leaveRoom(session);
  }
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  const room: Room = {
    code,
    mode,
    hostId: session.playerId,
    seats: [
      {
        id: session.playerId,
        name: session.name,
        kind: "human",
        connected: false,
      },
    ],
    table: null,
    sockets: new Map(),
    deadline: null,
    timers: {},
    usedPersonas: new Set(),
    rng: Date.now() % 0x7fffffff,
  };
  rooms.set(code, room);
  session.roomCode = code;
  if (mode === "pve") startTable(room);
  return snapshot(room, session.playerId);
}

export function joinRoom(session: Session, code: string): RoomSnapshot {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error("房间不存在");
  const existing = room.seats.find((s) => s.id === session.playerId);
  if (existing) {
    session.roomCode = room.code;
    return snapshot(room, session.playerId);
  }
  if (room.table) throw new Error("对局已经开始");
  if (room.seats.filter((s) => s.kind === "human").length >= 4) {
    throw new Error("房间已满");
  }
  if (room.seats.length >= 4) throw new Error("房间已满");
  room.seats.push({
    id: session.playerId,
    name: session.name,
    kind: "human",
    connected: false,
  });
  session.roomCode = room.code;
  broadcast(room);
  if (room.seats.length === 4) startTable(room);
  return snapshot(room, session.playerId);
}

export function attachSocket(session: Session, ws: WebSocket): void {
  if (!session.roomCode) {
    send(ws, { type: "error", message: "还没有加入房间" });
    return;
  }
  const room = rooms.get(session.roomCode);
  if (!room) {
    send(ws, { type: "error", message: "房间已解散" });
    return;
  }
  const seat = room.seats.find((s) => s.id === session.playerId);
  if (!seat) {
    send(ws, { type: "error", message: "你不在这张桌上" });
    return;
  }
  seat.connected = true;
  let set = room.sockets.get(session.playerId);
  if (!set) {
    set = new Set();
    room.sockets.set(session.playerId, set);
  }
  set.add(ws);
  send(ws, { type: "state", ...snapshot(room, session.playerId) });
  ensureLoop(room);
  broadcast(room);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as {
        type: string;
        action?: PlayerAction;
      };
      if (msg.type === "action" && msg.action) {
        play(room, session.playerId, msg.action);
      } else if (msg.type === "continue") {
        continueHand(room, session.playerId);
      } else if (msg.type === "start") {
        hostStart(room, session.playerId);
      } else if (msg.type === "fill_bots") {
        hostFill(room, session.playerId);
      }
    } catch (err) {
      send(ws, { type: "error", message: err instanceof Error ? err.message : "行动失败" });
    }
  });

  ws.on("close", () => {
    set!.delete(ws);
    if (set!.size === 0) {
      seat.connected = false;
      room.sockets.delete(session.playerId);
      broadcast(room);
    }
  });
}

function play(room: Room, playerId: string, action: PlayerAction): void {
  if (!room.table) throw new Error("对局尚未开始");
  room.table = applyAction(room.table, playerId, action);
  broadcast(room);
  schedule(room);
}

function continueHand(room: Room, playerId: string): void {
  if (!room.table || room.table.phase !== "settlement") return;
  if (playerId !== room.hostId && currentPlayer(room.table)?.id !== playerId) {
    // any seated human may continue
  }
  clearTimers(room);
  room.table = continueFromSettlement(room.table);
  broadcast(room);
  schedule(room);
}

function hostStart(room: Room, playerId: string): void {
  if (room.hostId !== playerId) throw new Error("只有房主可以开局");
  if (room.table) return;
  startTable(room);
}

function hostFill(room: Room, playerId: string): void {
  if (room.hostId !== playerId) throw new Error("只有房主可以补齐 Bot");
  if (room.table) return;
  startTable(room);
}

export function leaveRoom(session: Session): void {
  const code = session.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  session.roomCode = null;
  if (!room) return;
  const sockets = room.sockets.get(session.playerId);
  if (sockets) {
    for (const ws of sockets) ws.close();
    room.sockets.delete(session.playerId);
  }
  if (!room.table) {
    room.seats = room.seats.filter((s) => s.id !== session.playerId);
    if (room.seats.length === 0) {
      clearTimers(room);
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === session.playerId) {
      const nextHost = room.seats.find((s) => s.kind === "human");
      if (nextHost) room.hostId = nextHost.id;
    }
    broadcast(room);
  } else {
    const seat = room.seats.find((s) => s.id === session.playerId);
    if (seat) seat.connected = false;
    broadcast(room);
  }
}

export function roomSnapshotFor(session: Session): RoomSnapshot | null {
  if (!session.roomCode) return null;
  const room = rooms.get(session.roomCode);
  if (!room) {
    session.roomCode = null;
    return null;
  }
  if (!room.seats.some((s) => s.id === session.playerId)) return null;
  return snapshot(room, session.playerId);
}
