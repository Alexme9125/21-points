import { useEffect, useRef, useState } from "react";
import { Lobby } from "./Lobby";
import { RulesModal } from "./RulesModal";
import { TableView } from "./TableView";
import {
  connectRoom,
  createRoom,
  ensureSession,
  fetchMe,
  joinRoom,
  leaveRoom,
  persistName,
  savedName,
  type RoomSnapshot,
} from "./api";
import { armSoundUnlock } from "./sound";

const RULES_KEY = "hotpot.rulesSeen";

function unreadRules(): boolean {
  try {
    return localStorage.getItem(RULES_KEY) !== "1";
  } catch {
    return true;
  }
}

export function App() {
  const [name, setName] = useState(savedName() || "玩家");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [rulesOpen, setRulesOpen] = useState(unreadRules);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    armSoundUnlock();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchMe().then((me) => {
      if (!me) return;
      if (me.name) setName(me.name);
      if (me.room) setRoom(me.room);
    });
  }, []);

  useEffect(() => {
    if (!room) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      const ws = connectRoom(setRoom, setError);
      wsRef.current = ws;
      ws.onclose = () => {
        if (closed) return;
        retry = setTimeout(open, 900);
      };
    };
    open();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [room?.code]);

  function send(payload: unknown) {
    const trySend = () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return true;
      }
      return false;
    };
    if (!trySend()) setTimeout(trySend, 250);
  }

  async function enter(mode: "pve" | "pvp", code?: string) {
    setBusy(true);
    setError("");
    try {
      await ensureSession(name);
      const snap = code ? await joinRoom(code) : await createRoom(mode);
      setRoom(snap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法进入房间");
    } finally {
      setBusy(false);
    }
  }

  async function exit() {
    try {
      await leaveRoom();
    } catch {
      /* ignore */
    }
    setRoom(null);
  }

  function dismissRules() {
    try {
      localStorage.setItem(RULES_KEY, "1");
    } catch {
      /* ignore */
    }
    setRulesOpen(false);
  }

  const rules = (
    <RulesModal open={rulesOpen} onClose={dismissRules} />
  );

  if (!room) {
    return (
      <>
        <Lobby
          name={name}
          onName={setName}
          busy={busy}
          error={error}
          onPve={() => enter("pve")}
          onCreatePvp={() => enter("pvp")}
          onJoin={(code) => enter("pvp", code)}
          onOpenRules={() => setRulesOpen(true)}
        />
        {rules}
      </>
    );
  }

  return (
    <>
      <TableView
        room={room}
        now={now}
        error={error}
        onFold={() => send({ type: "action", action: { type: "fold" } })}
        onAdd={(amount) => send({ type: "action", action: { type: "add", amount } })}
        onContinue={() => send({ type: "continue" })}
        onLeave={exit}
        onFillBots={() => send({ type: "fill_bots" })}
        onOpenRules={() => setRulesOpen(true)}
        onRename={(next) => {
          setName(next);
          persistName(next);
          send({ type: "rename", name: next });
        }}
      />
      {rules}
    </>
  );
}
