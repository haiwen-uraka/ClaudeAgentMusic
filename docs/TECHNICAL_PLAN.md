# Claudio — 个人 AI 电台 技术规划文档

> **版本**: 0.1.0-draft  
> **日期**: 2026-06-23  
> **模式**: Test-Driven Development (TDD)  
> **目标**: 用 Node.js 搭建本地服务器 + PWA 前端，让 Claude 作为"DJ 大脑"接管你的听歌体验。

---

## 目录

1. [项目愿景](#1-项目愿景)
2. [架构总览](#2-架构总览)
3. [技术栈选型](#3-技术栈选型)
4. [目录结构](#4-目录结构)
5. [TDD 开发路线图](#5-tdd-开发路线图)
6. [各层详细任务](#6-各层详细任务)
7. [HTTP / WebSocket 契约](#7-http--websocket-契约)
8. [风险与依赖](#8-风险与依赖)

---

## 1. 项目愿景

Claudio 是一个运行在你本地的 **个人 AI 电台**。它通过 Claude 理解你的听歌习惯、当天日程与天气，像一个懂你的 DJ 一样，**自动规划** 你的音乐播放列表，并通过语音合成为你"播报"歌曲切换的理由。

| 角色 | 负责方 |
|------|--------|
| 🧠 大脑 | Claude (子进程, `claude -p`) |
| 🎵 音乐 | 网易云音乐 API (NeteaseCloudMusicApi) |
| 🗣️ 语音 | Fish Audio TTS |
| 📅 日程 | 飞书 API |
| 🌤️ 天气 | OpenWeatherMap API |
| 🔊 推流 | UPnP / DLNA (可选) |

---

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  第四层 · 交互表层                                           │
│  PWA (localhost:8080) — Player / Profile / Settings        │
│  ← WS /stream, REST /api/*                                 │
├──────────────────────────────────────────────────────────┤
│  第三层 · 运行时聚合                                          │
│  Context Window: 6 片 prompt 组装                            │
│  compute(fragments) → { say, play[], reason, segue }        │
├──────────────────────────────────────────────────────────┤
│  第二层 · 本地大脑                                            │
│  Router / Context / Claude Adapter / Scheduler / TTS / DB   │
├──────────────────────────────────────────────────────────┤
│  第一层 · 外部上下文                                          │
│  USER/ (taste.md 等)  ← Claude 子进程 ← 若干 API 服务        │
└──────────────────────────────────────────────────────────┘
```

### 四层职责速览

| 层 | 名称 | 核心职责 |
|----|------|----------|
| 1 | 外部上下文 | 用户口味文件、Claude 子进程、外部 API |
| 2 | 本地大脑 | 意图路由、Prompt 组装、Claude 调用、节律调度、TTS、状态持久化 |
| 3 | 运行时聚合 | 每次触发时把 6 片 prompt 拼进去，喂给模型，解析返回 |
| 4 | 交互表层 | PWA 前端，提供播放器、聊天流、设置页面 |

---

## 3. 技术栈选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 运行时 | Node.js >= 20 | 本地服务器，SSE/WS 原生支持 |
| 测试 | Vitest (单元) + Supertest (HTTP) + Playwright (E2E) | 快、零配置、覆盖全链路 |
| HTTP 服务 | Fastify | 性能好，WebSocket 内置，TypeScript 友好 |
| 数据库 | SQLite (better-sqlite3) | 单文件、零运维、跨重启持久化 |
| 子进程 | `execa` | 安全地 spawn `claude -p` |
| TTS | Fish Audio SDK (HTTP REST) | 已有 Fish Audio API |
| PWA 前端 | Vite + Vanilla TS | 轻量，单 `<audio>` 元素，SW 缓存 |
| 样式 | 自定义 CSS (手写风格) | 与截图的手绘风一致 |
| UPnP | `castv2-client` / `upnp-mediarenderer` | 推流到客厅音响 |

---

## 4. 目录结构

```
claudio/
├── docs/
│   └── TECHNICAL_PLAN.md          ← 你正在看的文件
├── package.json
├── vitest.config.ts
├── tsconfig.json
│
├── src/
│   ├── index.ts                    # 入口：启动 Fastify + WS
│   ├── config/
│   │   └── schema.ts              # 配置 schema (API keys, UPnP 设备等)
│   │
│   ├── user/                       # 第一层：外部上下文
│   │   ├── taste.md                # 用户口味档案（示例模板）
│   │   ├── routines.md             # 日常节律
│   │   ├── mood-rules.md           # 情绪映射规则
│   │   └── playlists.json          # 用户歌单引用
│   │
│   ├── brain/                      # 第二层：本地大脑
│   │   ├── router.ts              # 意图路由：简单指令 → NCM, 自然语言 → Claude
│   │   ├── context.ts             # Prompt 组装：6 片粘合
│   │   ├── claude-adapter.ts      # spawn claude -p, 解析 JSON 返回
│   │   ├── scheduler.ts           # 节律调度：早间规划 / 小时情绪检查
│   │   ├── tts.ts                 # Fish Audio → cache/tts/*.mp3
│   │   └── state.db.ts            # SQLite 封装 (messages, plays, plan, prefs)
│   │
│   ├── model/                      # 第三层：运行时聚合
│   │   ├── forward.ts             # compute(fragments) → { say, play[], ... }
│   │   └── fragments.ts           # 6 片 prompt 片段的读取与注入
│   │
│   ├── api/                        # HTTP + WebSocket 路由
│   │   ├── routes/
│   │   │   ├── chat.ts            # POST /api/chat
│   │   │   ├── now.ts             # GET  /api/now
│   │   │   ├── next.ts            # GET  /api/next
│   │   │   ├── taste.ts           # GET  /api/taste
│   │   │   └── plan.ts            # GET  /api/plan/today
│   │   └── ws.ts                  # WS /stream
│   │
│   ├── services/                   # 外部 API 封装
│   │   ├── ncm.ts                 # 网易云音乐 API
│   │   ├── fish-audio.ts          # Fish Audio TTS
│   │   ├── feishu.ts              # 飞书日历
│   │   ├── weather.ts             # OpenWeatherMap
│   │   └── upnp.ts                # UPnP 推流
│   │
│   └── pwa/                        # 第四层：PWA 前端
│       ├── index.html
│       ├── style.css
│       ├── app.ts                 # 主逻辑
│       ├── sw.ts                  # Service Worker
│       └── assets/
│
├── tests/
│   ├── unit/                       # 单元测试
│   │   ├── router.test.ts
│   │   ├── context.test.ts
│   │   ├── tts.test.ts
│   │   ├── forward.test.ts
│   │   └── state.test.ts
│   ├── integration/                # 集成测试
│   │   ├── api-chat.test.ts
│   │   ├── api-now.test.ts
│   │   └── ws-stream.test.ts
│   ├── fixtures/
│   │   └── claude-response.json    # Mock Claude 返回
│   └── e2e/                        # Playwright E2E
│       └── player-flow.spec.ts
│
└── cache/
    └── tts/                        # 语音缓存目录 (运行时生成)
```

---

## 5. TDD 开发路线图

> **原则**: 每个 Task 都遵循 **红 → 绿 → 重构** 循环。
> 每个 Task 都包含：测试清单 → 实现 → 验收标准。

### 概览

```
Phase 0 ─── 脚手架 & 基础设施 (无业务逻辑)
Phase 1 ─── 数据层          (state.db + 用户档案)
Phase 2 ─── 模型层          (forward + fragments + claude-adapter)
Phase 3 ─── 大脑层          (router + scheduler + tts)
Phase 4 ─── API 层          (5 个 REST + WS)
Phase 5 ─── PWA 前端        (Player + Chat + Settings)
Phase 6 ─── 集成 & E2E      (端到端打通 + 部署)
```

---

## 6. 各层详细任务

---

### Phase 0: 脚手架 & 基础设施

**目标**: 让项目能跑起来，测试框架就位，CI 绿灯。

#### Task 0.1 — 项目初始化

| | |
|---|---|
| **红** | `tests/unit/placeholder.test.ts` — 写一个 `expect(true).toBe(true)` |
| **绿** | `npm run test` 通过 |
| **重构** | 添加 `package.json` scripts: `test`, `test:watch`, `test:coverage` |

**验收**:
- [ ] `npm test` 输出通过
- [ ] `npm run test:coverage` 覆盖率 > 0%

#### Task 0.2 — Fastify 服务器骨架

| | |
|---|---|
| **红** | `tests/integration/server.test.ts` — 启动服务器，断言 `GET /health` 返回 `{ status: 'ok' }` |
| **绿** | `src/index.ts` 创建 Fastify 实例 + health route |
| **重构** | 将端口配置抽到 `config/schema.ts` |

```ts
// tests/integration/server.test.ts
import { buildServer } from '../../src/index'

test('GET /health returns ok', async () => {
  const app = await buildServer({ logger: false })
  const res = await app.inject({ method: 'GET', url: '/health' })
  expect(res.statusCode).toBe(200)
  expect(JSON.parse(res.payload)).toEqual({ status: 'ok' })
  await app.close()
})
```

**验收**:
- [ ] `GET /health` → 200 + `{ status: 'ok' }`
- [ ] 配置项 `PORT` 可覆盖

#### Task 0.3 — SQLite 数据库初始化

| | |
|---|---|
| **红** | `tests/unit/state.test.ts` — 断言 `state.db.ts` 能创建 `plays` 表并插入一行 |
| **绿** | 实现 `src/brain/state.db.ts`：用 `better-sqlite3` 创建 4 张表 (messages, plays, plan, prefs) |
| **重构** | 添加 migration 版本号，表创建前检查 `_meta` 表 |

```ts
// 期望的 Schema
CREATE TABLE IF NOT EXISTS plays (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id   TEXT NOT NULL,
  title     TEXT,
  artist    TEXT,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 另外 3 张: messages, plan, prefs
```

**验收**:
- [ ] 4 张表均可在磁盘上持久化
- [ ] 重启后数据保留

---

### Phase 1: 数据层 — 用户档案与状态

**目标**: 让 Claudio "记得你"。

#### Task 1.1 — 用户档案加载器

| | |
|---|---|
| **红** | `tests/unit/user-profile.test.ts` — 断言 `loadUserProfile()` 返回含 `taste`, `routines`, `moodRules` 的对象 |
| **绿** | 实现 `src/brain/user-profile.ts`：读取 `user/` 目录下的 `.md` 和 `.json` 文件 |
| **重构** | 支持热重载：文件变更时自动重新读取 (chokidar) |

**文件契约**:
```
user/taste.md      → Markdown, 描述口味偏好
user/routines.md   → Markdown, 日常节律 (07:00 起床, 09:00 通勤...)
user/mood-rules.md → Markdown, 情绪 → 音乐风格映射
user/playlists.json → JSON, 自定义歌单引用
```

**验收**:
- [ ] 缺失文件时返回空对象，不抛异常
- [ ] 文件修改后下次调用自动反映新内容

#### Task 1.2 — 状态读写 (state.db 完整实现)

| | |
|---|---|
| **红** | `tests/unit/state.test.ts` — 覆盖 CRUD: 记录播放、查询最近、保存偏好、记录消息 |
| **绿** | 补全 `state.db.ts` 全部 4 张表的操作接口 |
| **重构** | 用 `kysely` 风格的查询 builder 替代裸 SQL |

```ts
interface StateDB {
  // plays
  logPlay(songId: string, title: string, artist: string): Promise<void>
  recentPlays(limit?: number): Promise<Play[]>

  // messages
  saveMessage(role: 'user' | 'assistant', content: string): Promise<void>
  recentMessages(limit?: number): Promise<Message[]>

  // plan
  savePlan(date: string, plan: PlanEntry[]): Promise<void>
  getPlan(date: string): Promise<PlanEntry[]>

  // prefs
  getPref(key: string): Promise<string | null>
  setPref(key: string, value: string): Promise<void>
}
```

**验收**:
- [ ] 写入 → 重启 → 读取一致
- [ ] `recentPlays(20)` 按时间倒序返回最近 20 条

---

### Phase 2: 模型层 — Prompt 组装与 Claude 调用

**目标**: "每次触发按这 6 片粘 prompt" — 让 Claude 做出 DJ 决策。

#### Task 2.1 — 6 片 Prompt 片段读取

| | |
|---|---|
| **红** | `tests/unit/fragments.test.ts` — 断言 `buildFragments()` 返回 6 个片段的数组 |
| **绿** | 实现 `src/model/fragments.ts` |
| **重构** | 每个片段单独文件，支持条件注入 (有天气时才注入天气片段) |

```ts
interface PromptFragment {
  id: number        // 1-6
  label: string     // 如 "系统提示词"
  content: string   // 实际文本
}

// 6 片
// ① prompts/dj-persona.md   — 系统提示词
// ② user/*.md               — 用户品味料
// ③ weather + calendar + now — 环境注入
// ④ state.db (plays)        — 已检索记忆
// ⑤ /api/chat + ncm search   — 用户输入 / 工具结果
// ⑥ scheduler + webhook      — 执行轨迹
```

**验收**:
- [ ] 无天气 API key 时，片段 ③ 中天气部分为空但不崩溃
- [ ] `buildFragments()` 是纯函数，可反复调用

#### Task 2.2 — Context 组装 (context.ts)

| | |
|---|---|
| **红** | `tests/unit/context.test.ts` — 给定 mock 数据，断言 assemblePrompt() 的最终 system prompt 包含所有关键字段 |
| **绿** | 实现 `src/brain/context.ts`：把 6 片拼成一个 system prompt 字符串 |
| **重构** | 使用模板引擎或 tagged template literal，保持可读性 |

**Prompt 模板示例**:
```
你是 Claudio，一个懂用户听歌习惯的 AI DJ。

## 系统设定
[片段 ①: dj-persona.md]

## 用户品味
[片段 ②: taste.md + routines.md + mood-rules.md]

## 当前环境
[片段 ③: 天气、日历、当前时间]

## 最近记忆
[片段 ④: 最近 10 首播放记录]

## 用户输入
[片段 ⑤: 用户最新消息 + 相关搜索结果]

## 任务
根据以上信息，决定下一首要播放的歌曲。
输出 JSON:
{ "say": "...", "play": [{ "id": "...", "title": "...", "artist": "..." }], "reason": "...", "segue": "..." }
```

**验收**:
- [ ] 输出是一个完整的、可直接喂给 Claude 的字符串
- [ ] 片段顺序与设计文档一致

#### Task 2.3 — Claude 子进程适配器

| | |
|---|---|
| **红** | `tests/unit/claude-adapter.test.ts` — mock `execa('claude -p ...')`，断言解析出的 JSON 结构正确 |
| **绿** | 实现 `src/brain/claude-adapter.ts` |
| **重构** | 增加超时 (30s)、重试 (1 次)、错误分类 (超时 / JSON 解析失败 / Claude 报错) |

```ts
interface ClaudeResponse {
  say: string        // DJ 要说的话 (用于 TTS)
  play: Track[]      // 推荐播放列表
  reason: string     // 推荐理由
  segue: string      // 过渡语
}

class ClaudeAdapter {
  async call(systemPrompt: string, userInput: string): Promise<ClaudeResponse>
}
```

**关键实现点**:
- 命令: `claude -p --output json --max-turns 1`
- 传入: `-p` (print 模式, 无交互)
- 输出: JSON，需提取 `content` 中的 JSON 块
- 超时: 30 秒 (通过 `execa` 的 `timeout` 选项)

**验收**:
- [ ] Claude 返回合法 JSON → 解析成功
- [ ] Claude 返回非法 JSON → 抛 `ClaudeParseError`
- [ ] 超时 → 抛 `ClaudeTimeoutError`
- [ ] `claude` 命令不存在 → 抛 `ClaudeNotFoundError`

#### Task 2.4 — Forward 函数 (模型前向过程)

| | |
|---|---|
| **红** | `tests/unit/forward.test.ts` — 给定 mock fragments + mock adapter，断言返回 `{ say, play, reason, segue }` |
| **绿** | 实现 `src/model/forward.ts`：组合 fragments → context → claude → parse |
| **重构** | 提取 `NcmSearchTool` 接口，让 forward 在调用 Claude 前可以先做 NCM 搜索补充片段 ⑤ |

```ts
interface ForwardInput {
  userMessage: string
  // fragments 由 context.ts 自动构建
}

interface ForwardOutput {
  say: string
  play: Track[]
  reason: string
  segue: string
}

async function forward(input: ForwardInput): Promise<ForwardOutput>
```

**验收**:
- [ ] 完整链路: userMessage → 6 片 prompt → Claude → 结构化返回
- [ ] 中间任何一环失败 → 降级返回 (至少返回 `{ say: '稍等一下...', play: [], reason: '', segue: '' }`)

---

### Phase 3: 大脑层 — 路由、调度、TTS

**目标**: 让系统能自动运转，不只是被动响应。

#### Task 3.1 — 意图路由 (router.ts)

| | |
|---|---|
| **红** | `tests/unit/router.test.ts` — 覆盖: 简单指令 (`"播放周杰伦"`), 自然语言 (`"帮我找点适合下雨天听的歌"`) |
| **绿** | 实现 `src/brain/router.ts` |
| **重构** | 用正则 / 关键词匹配做快速分流，只有需要理解时才走 Claude |

```ts
type Route =
  | { kind: 'ncm-search'; query: string }
  | { kind: 'ncm-play'; songId: string }
  | { kind: 'chat'; message: string }
  | { kind: 'weather'; city?: string }
  | { kind: 'plan' }

function route(input: string): Route {
  // 简单指令: 播放 / 暂停 / 下一首 → ncm
  // 包含"天气" → weather
  // 包含"日程" / "安排" → plan
  // 默认 → chat (走 Claude)
}
```

**验收**:
- [ ] `"播放晴天"` → `{ kind: 'ncm-search', query: '晴天' }`
- [ ] `"今天天气怎么样"` → `{ kind: 'weather' }`
- [ ] `"给我讲个笑话"` → `{ kind: 'chat', message: '给我讲个笑话' }`

#### Task 3.2 — 节律调度器 (scheduler.ts)

| | |
|---|---|
| **红** | `tests/unit/scheduler.test.ts` — 用假时间，断言 07:00 触发早间规划、09:00 触发通勤规划 |
| **绿** | 实现 `src/brain/scheduler.ts`：基于 node-cron 的定时任务 |
| **重构** | 添加 webhook 入口: `POST /api/webhook/scheduler` 供飞书回调触发 |

```ts
interface ScheduledTask {
  name: string
  cron: string
  handler: () => Promise<void>
}

// 预设任务:
// - 07:00 早间规划 (生成今日播放计划)
// - 09:00 通勤场景 (切换场景)
// - 每小时情绪检查 (被动触发)
// - 日历 hook (飞书 webhook)
```

**验收**:
- [ ] 服务器启动后 07:00 自动触发早间规划
- [ ] 支持手动触发: `POST /api/webhook/scheduler?task=morning`
- [ ] 任务执行结果写入 `state.db.plan`

#### Task 3.3 — TTS 管线 (tts.ts)

| | |
|---|---|
| **红** | `tests/unit/tts.test.ts` — 断言 `speak("hello")` 返回 `/tts/<hash>.mp3` 路径，且文件存在 |
| **绿** | 实现 `src/brain/tts.ts`：Fish Audio API → 本地缓存 |
| **重构** | 添加 LRU 缓存清理，磁盘超过 100MB 时删除最旧文件 |

```ts
class TtsEngine {
  async speak(text: string): Promise<string>  // 返回 /tts/<hash>.mp3
  async clearCache(): Promise<void>
}
```

**Fish Audio API 调用示例**:
```ts
// POST https://api.fish.audio/v1/tts
// Body: { text, reference_id: "..." }
// Returns: { audio: "<base64 or url>" }
```

**验收**:
- [ ] 相同文本第二次调用 → 命中缓存，不请求 API
- [ ] `clearCache()` 删除超过 7 天的文件
- [ ] 文本为空 → 返回 null

---

### Phase 4: API 层 — 5 个 REST + WebSocket

**目标**: PWA 能通过 HTTP 和 WS 与本地服务器通信。

#### Task 4.1 — POST /api/chat (核心接口)

| | |
|---|---|
| **红** | `tests/integration/api-chat.test.ts` — 发 POST，断言 200 且返回 `{ say, play, nowPlaying }` |
| **绿** | 实现 `src/api/routes/chat.ts` |
| **重构** | 添加请求验证 (zod 或 fastify schema) |

```
Request:
  POST /api/chat
  Content-Type: application/json
  { "message": "帮我找点适合现在听的歌", "scene": "morning" }

Response 200:
  {
    "say": "早上好！今天有点阴，给你来点温暖的...",
    "play": [
      { "id": "song_001", "title": "晴天", "artist": "周杰伦" }
    ],
    "nowPlaying": { "id": "song_001", "title": "晴天", "artist": "周杰伦", "tts": "/tts/abc123.mp3" },
    "reason": "早上 + 阴天 → 温暖系民谣"
  }
```

**内部流程**:
1. `router.route(message)` → Route
2. `context.assemblePrompt(fragments)` → systemPrompt
3. `forward.forward({ userMessage })` → ClaudeResponse
4. `tts.speak(claudeResponse.say)` → `/tts/<hash>.mp3`
5. 返回

**验收**:
- [ ] 合法输入 → 200 + 结构化 JSON
- [ ] 空消息 → 400
- [ ] Claude 调用超时 → 502 + 降级响应

#### Task 4.2 — GET /api/now

| | |
|---|---|
| **红** | `tests/integration/api-now.test.ts` — 断言返回当前播放曲目 + TTS 路径 |
| **绿** | 实现 `src/api/routes/now.ts` |
| **重构** | 从 `state.db` 读取最近一条 play 记录 |

```ts
// Response 200
{
  "nowPlaying": { "id": "...", "title": "...", "artist": "...", "album": "...", "cover": "..." },
  "tts": "/tts/abc123.mp3",
  "isPlaying": true,
  "progress": 0.35   // 播放进度 0~1
}
```

**验收**:
- [ ] 无播放记录 → 200 + `nowPlaying: null`

#### Task 4.3 — GET /api/next

| | |
|---|---|
| **红** | `tests/integration/api-next.test.ts` — 断言返回播放队列中的下一首 |
| **绿** | 实现 `src/api/routes/next.ts` |
| **重构** | 支持 `?count=5` 参数，返回接下来 N 首 |

```ts
// Response 200
{
  "queue": [
    { "id": "s1", "title": "晴天", "artist": "周杰伦" },
    { "id": "s2", "title": "七里香", "artist": "周杰伦" }
  ]
}
```

#### Task 4.4 — GET /api/taste

| | |
|---|---|
| **红** | `tests/integration/api-taste.test.ts` — 断言返回用户的品味档案 |
| **绿** | 实现 `src/api/routes/taste.ts` |
| **重构** | 从 `user/` 目录读取，不暴露原始路径 |

```ts
// Response 200
{
  "taste": "...",          // taste.md 内容
  "routines": "...",       // routines.md 内容
  "moodRules": "...",      // mood-rules.md 内容
  "recentGenres": ["民谣", "爵士"],  // 从 plays 统计
  "stats": { "totalPlays": 142, "favoriteArtist": "周杰伦" }
}
```

#### Task 4.5 — GET /api/plan/today

| | |
|---|---|
| **红** | `tests/integration/api-plan.test.ts` — 断言返回今天的播放计划 |
| **绿** | 实现 `src/api/routes/plan.ts` |
| **重构** | 如果 scheduler 未生成过计划 → 触发一次 on-demand 规划 |

```ts
// Response 200
{
  "date": "2026-06-23",
  "slots": [
    { "time": "07:00", "scene": "morning",  "tracks": [...] },
    { "time": "09:00", "scene": "commute",  "tracks": [...] },
    { "time": "12:00", "scene": "lunch",    "tracks": [...] },
    { "time": "18:00", "scene": "evening",  "tracks": [...] }
  ]
}
```

#### Task 4.6 — WebSocket /stream

| | |
|---|---|
| **红** | `tests/integration/ws-stream.test.ts` — 连接 WS，发送 `{"type":"chat","message":"嗨"}`，断言收到 `type: "assistant"` 事件 |
| **绿** | 实现 `src/api/ws.ts` |
| **重构** | 添加心跳检测 (ping/pong) 和断线重连 |

```ts
// Client → Server
{ "type": "chat",      "message": "找点适合下雨天的歌" }
{ "type": "play",      "songId": "xxx" }
{ "type": "pause" }

// Server → Client
{ "type": "assistant", "say": "雨天...", "play": [...], "tts": "/tts/abc.mp3" }
{ "type": "nowPlaying", "track": {...}, "progress": 0.35 }
{ "type": "queueUpdate", "queue": [...] }
{ "type": "error",      "message": "..." }
```

**验收**:
- [ ] WS 连接 → 发送消息 → 收到响应 < 5s
- [ ] 服务端崩溃 → 客户端收到 `type: "error"`
- [ ] 支持多客户端同时连接

---

### Phase 5: PWA 前端

**目标**: 一个可安装的 PWA，三个视图（播放器 / 个人档案 / 设置）。

#### Task 5.1 — PWA Shell & Service Worker

| | |
|---|---|
| **红** | `tests/e2e/pwa-shell.spec.ts` — 断言 SW 注册成功、离线时 SW 拦截请求 |
| **绿** | `pwa/sw.ts` + `vite.config.ts` PWA 配置 |
| **重构** | 添加 `precache` 清单，核心资源离线可用 |

**PWA 要求**:
- `manifest.json`: name, short_name, start_url, display: standalone, theme_color
- SW: 缓存 `index.html`, `app.ts`, `style.css` → 离线可打开
- `prefetch 10s`: 播放器页面预加载当前歌的下一首

#### Task 5.2 — 播放器视图

| | |
|---|---|
| **红** | `tests/e2e/player-flow.spec.ts` — 加载页面 → 断言存在 `<audio>` 元素 + 播放/暂停按钮 |
| **绿** | `pwa/index.html` + `pwa/app.ts` Player 模块 |
| **重构** | 支持键盘快捷键 (空格 = 暂停, → = 下一首) |

```
┌─────────────────────┐
│   ◁  ▷  ▷▷          │   ← 播放控制
│                     │
│   ┌───────────┐     │
│   │  专辑封面   │     │   ← 200x200
│   └───────────┘     │
│                     │
│   晴天               │   ← 歌名
│   周杰伦             │   ← 歌手
│                     │
│   ━━━━━━●━━━━━━━━   │   ← 进度条
│   1:23 / 4:29       │
│                     │
│   🔊 ━━━━━━━━━      │   ← 音量
└─────────────────────┘
```

#### Task 5.3 — 聊天视图 (WS 流式对话)

| | |
|---|---|
| **红** | `tests/e2e/chat-flow.spec.ts` — 发送消息 → 断言收到 assistant 气泡 |
| **绿** | 实现聊天面板 + WS 连接 |
| **重构** | 支持 Markdown 渲染 (简单的 **bold** / *italic*) |

**交互流**:
```
用户: "找点适合现在听的歌"
  └─→ POST /api/chat
       └─→ { say: "雨天给你来点...", play: [...] }
            └─→ TTS 自动播放
            └─→ 播放器自动切到第一首
            └─→ 聊天区显示 "雨天给你来点..."
```

#### Task 5.4 — 设置视图

| | |
|---|---|
| **红** | `tests/e2e/settings-flow.spec.ts` — 填写 API key → 保存 → 刷新 → 值保留 |
| **绿** | 实现设置表单 (localStorage 持久化) |
| **重构** | 敏感字段 (API keys) 不存 localStorage → 通过 POST 保存到 `state.db.prefs` |

**设置项**:
- 网易云 API 地址 (默认 http://localhost:3000)
- Fish Audio API Key
- OpenWeather API Key
- 飞书 App ID / Secret
- UPnP 设备选择
- 默认音量
- TTS 开关

---

### Phase 6: 集成 & E2E

**目标**: 端到端跑通，从用户打开 PWA 到 Claude 推荐并播放一首歌。

#### Task 6.1 — 端到端主流程

| 场景 | 步骤 | 预期 |
|------|------|------|
| 打开 PWA | 访问 localhost:8080 | 播放器界面加载，SW 注册成功 |
| 发送消息 | 聊天框输入"找点适合早上听的歌" | 收到 Claude 回复 + TTS 播放 + 自动切歌 |
| 手动切歌 | 点击下一首 | 播放下一首，`/api/now` 更新 |
| 早间计划 | 修改系统时间到 07:00 | 自动触发早间规划，生成今日计划 |
| 离线使用 | 关闭服务器再打开 | 播放器界面仍可加载 (SW 缓存) |

**验收测试** (Playwright):
```ts
// tests/e2e/claudio-flow.spec.ts
test('complete user flow', async ({ page }) => {
  await page.goto('http://localhost:8080')
  await expect(page.locator('audio')).toBeAttached()

  // 发送聊天
  await page.fill('#chat-input', '找点适合下雨天听的歌')
  await page.click('#chat-send')
  await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 15000 })

  // 验证播放器更新
  await expect(page.locator('.track-title')).not.toBeEmpty()
})
```

#### Task 6.2 — Claude 子进程 Mock 方案

> 在 CI 中，没有 `claude` CLI。需要用 mock。

```ts
// tests/helpers/mock-claude.ts
export function mockClaude(response: ClaudeResponse) {
  vi.mock('execa', () => ({
    execa: vi.fn(() => Promise.resolve({
      stdout: JSON.stringify({ content: [JSON.stringify(response)] })
    }))
  }))
}
```

**验收**:
- [ ] CI (GitHub Actions) 全量测试通过 (不依赖 Claude CLI)
- [ ] 本地开发可切换 mock / real 模式

#### Task 6.3 — 性能基准

| 指标 | 目标 | 测试方式 |
|------|------|----------|
| PWA 首屏加载 | < 2s | Lighthouse |
| API 响应 (P95) | < 500ms | autocannon |
| WS 消息延迟 | < 100ms | 自定义计时 |
| TTS 首字节 | < 1s (缓存命中 < 10ms) | 计时 |
| Claude 端到端 | < 8s | 集成测试 |

---

## 7. HTTP / WebSocket 契约

### REST API 汇总

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/health` | 健康检查 | — | `{ status: "ok" }` |
| POST | `/api/chat` | 发送消息给 DJ | `{ message, scene? }` | `{ say, play, nowPlaying, reason }` |
| GET | `/api/now` | 当前播放 | — | `{ nowPlaying, tts, isPlaying, progress }` |
| GET | `/api/next` | 播放队列 | `?count=5` | `{ queue: Track[] }` |
| GET | `/api/taste` | 用户品味 | — | `{ taste, routines, moodRules, stats }` |
| GET | `/api/plan/today` | 今日计划 | — | `{ date, slots[] }` |
| POST | `/api/webhook/scheduler` | 调度器触发 | `{ task }` | `{ triggered: true }` |

### WebSocket 消息格式

```ts
// Client → Server
type ClientMessage =
  | { type: 'chat'; message: string }
  | { type: 'play'; songId: string }
  | { type: 'pause' }
  | { type: 'next' }
  | { type: 'seek'; progress: number }

// Server → Client
type ServerMessage =
  | { type: 'assistant'; say: string; play: Track[]; tts?: string }
  | { type: 'nowPlaying'; track: Track; progress: number; tts: string }
  | { type: 'queueUpdate'; queue: Track[] }
  | { type: 'error'; message: string }
  | { type: 'pong' }
```

### Claude 子进程契约

```bash
# 调用命令
claude -p --output json --max-turns 1 "用户输入"

# 期望 stdout (JSON)
{
  "content": [
    { "type": "text", "text": '{"say":"...","play":[...],"reason":"...","segue":"..."}' }
  ]
}
```

---

## 8. 风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| `claude -p` CLI 变更 | 子进程调用失败 | 封装 `ClaudeAdapter`，只暴露接口；变更只需改一处 |
| 网易云 API 不稳定 | 搜索/播放失败 | 添加 fallback (备用 API / 本地缓存) |
| Fish Audio API 费用 | TTS 成本 | LRU 缓存 + 文本去重 |
| UPnP 设备发现慢 | 启动延迟 | 异步发现，不阻塞主流程 |
| TTS 延迟影响体验 | 用户等太久 | 先返回 JSON，TTS 后台异步处理 |

### 外部依赖清单

| 服务 | 用途 | 必需? |
|------|------|-------|
| Claude (Max 订阅) | AI 决策 | ✅ 核心 |
| NeteaseCloudMusicApi | 音乐搜索/播放 | ✅ 核心 |
| Fish Audio | 语音合成 | ⭐ 推荐 (可降级为静默) |
| OpenWeatherMap | 天气 | ⭐ 推荐 (可选) |
| 飞书 API | 日历 | ⭐ 推荐 (可选) |
| UPnP 设备 | 推流 | ❌ 可选 |

---

## 附录 A: Claude Prompt 模板 (dj-persona.md)

```markdown
你是 Claudio，用户的个人 AI 电台 DJ。

## 身份
- 名字: Claudio
- 风格: 像一位懂音乐的挚友，会讲段子、会读日程、会看天气
- 语言: 中文为主，穿插英文歌名/术语

## 能力
- 通过搜索找到用户想听的歌
- 根据天气、日程、用户口味推荐音乐
- 用语音播报推荐理由
- 无缝过渡到下一首歌

## 输出格式
每次只输出 JSON，不要有其他文字:
{
  "say": "给用户听的一句话播报",
  "play": [
    { "id": "netease_song_id", "title": "歌名", "artist": "歌手" }
  ],
  "reason": "推荐理由 (简短)",
  "segue": "过渡语 (下一首衔接时用)"
}

## 约束
- play 数组 1-3 首歌
- say 不超过 50 字
- reason 不超过 30 字
- 如果用户没明确要求，不要重复最近 10 首播放过的歌
```

## 附录 B: 快速启动命令

```bash
# 1. 克隆后
npm install

# 2. 复制环境变量
cp .env.example .env

# 3. 启动开发
npm run dev          # 启动服务器 (端口 8080)
npm run dev:client   # Vite 前端 (端口 5173, proxy 到 8080)

# 4. 测试
npm test             # 全量测试
npm run test:watch   # 监听模式

# 5. 构建
npm run build        # tsc 编译
npm run start        # 生产启动
```

## 附录 C: 里程碑检查清单

- [ ] **M1** (Phase 0-1): 服务器启动、SQLite 写入、用户档案加载 — 约 1 周
- [ ] **M2** (Phase 2): Prompt 组装、Claude 调用、Forward 链路 — 约 1 周
- [ ] **M3** (Phase 3): 路由、调度器、TTS — 约 1 周
- [ ] **M4** (Phase 4): 5 个 REST + WS — 约 1 周
- [ ] **M5** (Phase 5): PWA 前端 — 约 1-2 周
- [ ] **M6** (Phase 6): E2E + 性能调优 + 部署 — 约 1 周

**总计**: 约 6-7 周完成 MVP。
