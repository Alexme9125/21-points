# 吃火锅

武汉地区棋牌玩法「吃火锅」（癞子山庄）的网页对战。规则按[百度百科·吃火锅](https://baike.baidu.com/item/吃火锅/7980913)落地；界面做成浅色极简德州桌，货币为虚拟 **Tokens**，中央底池叫 **许愿池**。

人机座位从 Claude、GPT、Gemini、Grok、MiniMax、Qwen、DeepSeek、GLM、Kimi 中抽选，头像为仓库内原创几何标，不使用各厂官方 logo。

## 本地开发

需要 Node.js 20+。

```bash
npm install
npm test
npm run dev
```

浏览器打开 http://127.0.0.1:5173 （Vite 会把 `/api` 和 `/ws` 代理到 8080）。

生产模式（单端口同时提供页面和 WebSocket）：

```bash
npm run build
npm start
```

默认监听 `8080`。

## Docker

```bash
docker compose up --build
```

打开 http://127.0.0.1:8080 。

## 玩法摘要

- 四人、52 张牌，点数 `A < 2 < … < K`，两张底牌全桌可见。
- 每人先向许愿池投入 50K Tokens，最小添菜 5K，开局 500K。
- 第三张落在两点数之间则从许愿池赢等额；落在外面则投入许愿池。
- 连张自动放弃。牛角尖扣 2 倍（A+K 为超级牛角尖，扣 4 倍）。对子只能下最小添菜，再开出同点通吃许愿池。
- 许愿池被赢空则本盘结束；满 40 次发牌则摊掉一半。

本游戏仅为计分娱乐，Tokens 不是真实货币。
