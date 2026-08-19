import assert from "node:assert/strict";
import { test } from "node:test";
import { createRoom, joinRoom, leaveRoom, roomSnapshotFor } from "./rooms.js";
import type { Session } from "./session.js";

function session(id: string, name: string): Session {
  return { token: `t-${id}`, playerId: id, name, roomCode: null };
}

function sitPvp(n = 4): { host: Session; guests: Session[]; code: string } {
  const host = session(`h-${Math.random().toString(16).slice(2)}`, "房主");
  const snap = createRoom(host, "pvp");
  const guests: Session[] = [];
  for (let i = 1; i < n; i++) {
    const guest = session(`${host.playerId}-g${i}`, `玩家${i}`);
    joinRoom(guest, snap.code);
    guests.push(guest);
  }
  return { host, guests, code: snap.code };
}

function leaveAll(players: Session[]): void {
  for (const player of players) leaveRoom(player);
}

test("PVP leave during a started game ends the table and vacates the seat", () => {
  const { host, guests, code } = sitPvp(4);
  const leaver = guests[2]!;
  try {
    const started = roomSnapshotFor(host);
    assert.ok(started?.state, "four players should auto-start");
    assert.equal(started.started, true);
    assert.equal(started.seats.length, 4);

    leaveRoom(leaver);
    const after = roomSnapshotFor(host);
    assert.ok(after);
    assert.equal(after.code, code);
    assert.equal(after.started, false);
    assert.equal(after.state, null);
    assert.equal(after.seats.length, 3);
    assert.ok(!after.seats.some((s) => s.id === leaver.playerId));
    assert.equal(after.seats.filter((s) => s.kind === "human").length, 3);
    assert.match(after.status, /等待开局/);
  } finally {
    leaveAll([host, ...guests]);
  }
});

test("PVP host leave during a game transfers host and returns to waiting", () => {
  const { host, guests } = sitPvp(4);
  try {
    assert.ok(roomSnapshotFor(host)?.state);
    leaveRoom(host);
    const after = roomSnapshotFor(guests[0]!);
    assert.ok(after);
    assert.equal(after.started, false);
    assert.equal(after.state, null);
    assert.notEqual(after.hostId, host.playerId);
    assert.ok(after.seats.some((s) => s.id === after.hostId));
    assert.equal(after.seats.length, 3);
  } finally {
    leaveAll([host, ...guests]);
  }
});

test("PVP room accepts a new player after someone leaves mid-game", () => {
  const { host, guests, code } = sitPvp(4);
  const extra = session(`${code}-extra`, "新人");
  try {
    leaveRoom(guests[0]!);
    const waiting = roomSnapshotFor(host);
    assert.equal(waiting?.started, false);

    const joined = joinRoom(extra, code);
    assert.equal(joined.seats.length, 4);
    assert.ok(joined.state, "fourth join should start a fresh table");
    assert.equal(joined.started, true);
  } finally {
    leaveAll([host, ...guests, extra]);
  }
});

test("last PVP player leaving a started game deletes the room", () => {
  const { host, guests, code } = sitPvp(4);
  try {
    assert.ok(roomSnapshotFor(host)?.state);
    leaveAll([host, ...guests]);
    const ghost = session(`${code}-ghost`, "幽灵");
    assert.throws(() => joinRoom(ghost, code), /房间不存在/);
  } finally {
    leaveAll([host, ...guests]);
  }
});
