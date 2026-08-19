import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachSocket, createRoom, joinRoom, leaveRoom, roomSnapshotFor } from "./rooms.js";
import { createSession, getSession } from "./session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist");

function requireSession(token: unknown) {
  const session = getSession(typeof token === "string" ? token : undefined);
  if (!session) {
    const err = new Error("请先填写昵称");
    (err as Error & { statusCode?: number }).statusCode = 401;
    throw err;
  }
  return session;
}

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  app.get("/api/me", async (req, reply) => {
    const token = (req.query as { token?: string }).token;
    const session = requireSession(token);
    return reply.send({ ...session, room: roomSnapshotFor(session) });
  });

  app.post("/api/session", async (req) => {
    const body = (req.body ?? {}) as { name?: string; token?: string };
    return createSession(body.name ?? "玩家", body.token);
  });

  app.post("/api/rooms", async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string; mode?: "pve" | "pvp" };
    const session = requireSession(body.token);
    const mode = body.mode === "pvp" ? "pvp" : "pve";
    const snap = createRoom(session, mode);
    return reply.send(snap);
  });

  app.post("/api/rooms/:code/join", async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string };
    const session = requireSession(body.token);
    const { code } = req.params as { code: string };
    try {
      return reply.send(joinRoom(session, code));
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "加入失败" });
    }
  });

  app.post("/api/rooms/leave", async (req, reply) => {
    const body = (req.body ?? {}) as { token?: string };
    const session = requireSession(body.token);
    leaveRoom(session);
    return reply.send({ ok: true });
  });

  app.get("/ws", { websocket: true }, (socket, req) => {
    const url = new URL(req.url, "http://localhost");
    const session = getSession(url.searchParams.get("token") ?? undefined);
    if (!session) {
      socket.send(JSON.stringify({ type: "error", message: "会话无效" }));
      socket.close();
      return;
    }
    attachSocket(session, socket);
  });

  if (fs.existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url ?? "";
      if (url.startsWith("/api") || url.startsWith("/ws")) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
