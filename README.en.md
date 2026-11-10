[English](README.en.md) · [简体中文](README.md)

[![21 Points — a green rounded-square icon with two playing cards](docs/assets/readme-banner.png)](docs/assets/logo.png)

# 21 Points (Blackjack)

A browser-based Blackjack game for 1 to 6 players against the dealer. Rules follow the [Baidu Baike Blackjack entry](https://baike.baidu.com/item/21点/5481683). You can play solo with bots (PVE) or open a multiplayer room with a six-character room code (PVP). The web interface is in Chinese.

You can set the table size from 1 to 6 seats in the lobby, or the host can adjust it in a waiting room before the game starts. PVE tables fill empty seats with bots right away. PVP rooms start automatically once all seats are taken by human players, or the host can fill the remaining seats with bots to start early. Nine built-in bot personas vary in bet sizing, risk tolerance, and thinking time (3.6 to 12 seconds). In PVP rooms, players can rename themselves from their seat, and if a human player leaves during a hand, the match resets to the waiting room. Human turns have a 30-second timer (8 seconds when disconnected); when time expires, the server places the 1K minimum bet during betting or stands during play.

The repository is an npm-workspaces TypeScript monorepo with three packages: `@hotpot/engine` (`packages/engine`) for the pure TypeScript game rules and state machine, `@hotpot/server` (`apps/server`) for the Fastify 5 HTTP and WebSocket room server, and `@hotpot/web` (`apps/web`) for the React 19 and Vite 6 client. The server keeps rooms and sessions in memory, so restarting the process clears active games.

## Rules and gameplay

The shoe size scales with the seat count: 1 deck (52 cards) for 1 seat, 2 decks for 2 to 3 seats, 4 decks for 4 to 5 seats, and 6 decks for 6 seats. Before dealing a new round, the server reshuffles if fewer than 25% of the cards (or fewer than 20 cards) remain. Cards 2 through 10 count at face value, J / Q / K count as 10, and Aces count as 1 or 11.

Each player starts with 100K Tokens, and per-round bets range from 1K to 10K in 1K steps. During betting, players can pick a quick chip (`1K`, `2K`, `5K`, `10K`), repeat their previous bet (`续注`), double their previous bet (`续×2`), or enter a custom amount with the desktop slider or text input (accepts plain numbers or `K`/`M` suffixes such as `3000` or `3K`).

After everyone bets, each player receives two face-up cards and the dealer takes one upcard and one hole card. On your turn, you can hit (`要牌`) or stand (`停牌`). Exceeding 21 busts (`爆牌`) and loses the wager immediately, even if the dealer later busts. With two initial cards (other than a Blackjack) and enough tokens, you can double down (`加倍`) to double the stake, draw one card, and stand. A two-card pair of the same rank can be split (`分牌`) into two hands for a second equal bet; players cannot resplit, split Aces receive one card each and stand immediately, and a two-card 21 after a split pays 1 to 1 as a regular 21. Before taking a third card or splitting, if the dealer's upcard is not an Ace, you can surrender (`投降`) and recover half your wager.

If the dealer's initial two cards form a Blackjack (an Ace with a 10-value card), the round settles immediately. Otherwise, once all player hands finish, the dealer reveals the hole card, hits on 16 or less, and stands on 17 or more (including soft 17). A natural Blackjack pays 2 to 1 (returning 3x the wager, or pushing if the dealer also has Blackjack). Regular wins pay 1 to 1, and equal totals push. There is no insurance. A session settles after 12 rounds or when no player has at least 1K Tokens left, after which players can continue to the next session. Tokens are for scorekeeping only.

## Local development

Install Node.js 20 or later.

```bash
npm install
npm run dev
```

`npm run dev` builds `@hotpot/engine` once, then runs the engine TypeScript watcher, the Fastify server on port `8080`, and the Vite dev server on port `5173`. Open `http://127.0.0.1:5173` in your browser (Vite proxies `/api` and `/ws` to `http://127.0.0.1:8080`).

## Build and deployment

Build all workspaces and start the production server. A single Fastify process serves the compiled web assets from `apps/web/dist` along with the `/api` and `/ws` endpoints.

```bash
npm run build
npm start
```

The server listens on `0.0.0.0:8080` by default. Set `PORT` and `HOST` in the environment to change the port or bind address.

You can also build and run the container with Docker Compose.

```bash
docker compose up --build
```

Then open `http://127.0.0.1:8080`.

## Testing

```bash
npm test        # Build the engine, then run Vitest engine tests and Node server room tests
npm run lint    # Type-check and build @hotpot/engine and @hotpot/web
```

## License

[Apache-2.0](LICENSE)
