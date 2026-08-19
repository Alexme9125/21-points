# AGENTS.md

## Cursor Cloud specific instructions

This repo is an npm-workspaces TypeScript monorepo for the "吃火锅" (Eating Hotpot) multiplayer card game. Standard commands live in `README.md` and the root `package.json` `scripts`; prefer those. Notes below are the non-obvious gotchas.

### Services
- `@hotpot/engine` (`packages/engine`): pure TS game engine. Not a long-running service, but its compiled `dist/` is imported by both other packages, so it MUST be built before the server/web run. `npm run dev` builds it once, then runs `tsc --watch` for it.
- `@hotpot/server` (`apps/server`): Fastify HTTP + WebSocket backend on port `8080` (`PORT`/`HOST` env override). In production it also serves the built web bundle from `apps/web/dist`.
- `@hotpot/web` (`apps/web`): React + Vite client on port `5173` (dev only). Vite proxies `/api` and `/ws` to `127.0.0.1:8080`, so the backend must be running for the dev frontend to work. In production the web bundle is served by the backend on `8080`, not by Vite.

### Non-obvious notes
- Run everything together with `npm run dev` (concurrently runs engine watch + server + web). Open `http://127.0.0.1:5173`.
- `npm run lint` is NOT a real linter — there is no ESLint/Prettier config. It is a TypeScript type-check gate (`tsc` for engine + `vite build` for web).
- Server tests use Node's built-in test runner via `tsx --test` (not vitest); engine tests use vitest. `npm test` runs both.
- No database, cache, or external services — all room/session state is in-memory `Map`s, so restarting the server clears all game state.
- The lobby requires a nickname before `/api/me` succeeds; hitting the API without a session returns `401 请先填写昵称` (expected, not an error).
