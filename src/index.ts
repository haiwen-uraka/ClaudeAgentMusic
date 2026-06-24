// Claudio — personal AI radio station
// Entry point: exports a Fastify plugin

import Fastify from 'fastify'
import { loadConfig } from './config/schema.js'
import { createChatRoutes } from './api/routes/chat.js'
import { createNowRoutes } from './api/routes/now.js'
import { createNextRoutes } from './api/routes/next.js'
import { createTasteRoutes } from './api/routes/taste.js'
import { createPlanRoutes } from './api/routes/plan.js'
import { createWsRoutes } from './api/routes/ws.js'
import { createSearchRoutes } from './api/routes/search.js'
import { createSongUrlRoutes } from './api/routes/song-url.js'
import { createPlayRoutes } from './api/routes/play.js'
import { StateDB } from './brain/state.db.js'
import { UserProfile } from './user/profile.js'
import { FragmentsBuilder } from './model/fragments.js'
import { ContextAssembler } from './brain/context.js'
import { ClaudeAdapter } from './brain/claude-adapter.js'
import { ForwardEngine } from './model/forward.js'
import { TtsEngine } from './brain/tts.js'
import { NeteaseCloudMusicApi } from './services/ncm.js'
import Database from 'better-sqlite3'
import { join, resolve, sep } from 'path'
import { mkdirSync } from 'fs'
import websocket from '@fastify/websocket'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

export { VERSION } from './config/schema.js'

export async function buildServer(opts?: { logger?: boolean }) {
  const config = loadConfig()
  const app = Fastify({
    logger: opts?.logger ?? false,
  })

  // Register WebSocket plugin FIRST
  await app.register(websocket)

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
  }))

  // CORS headers for API access from browser
  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api') || request.url === '/stream') {
      reply.header('Access-Control-Allow-Origin', '*')
      reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type')
    }
  })

  app.head('/api/*', async () => ({}))
  app.options('/api/*', async () => ({}))

  // Initialize state DB (create data dir if needed)
  const dataDir = join(process.cwd(), 'data')
  mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'claudio.db')
  const sqlite = new Database(dbPath)
  const state = new StateDB(sqlite)

  // User profile
  const userDir = join(process.cwd(), 'src', 'user')
  const userProfile = new UserProfile(userDir)

  // NCM service
  const ncm = new NeteaseCloudMusicApi(config.ncmApiUrl)

  // TTS engine
  const tts = new TtsEngine(join(process.cwd(), 'cache', 'tts'), config.fishAudioApiKey)

  // Forward engine (Claude brain)
  let forwardEngine: ForwardEngine
  try {
    const builder = new FragmentsBuilder(process.cwd())
    const claude = new ClaudeAdapter()
    forwardEngine = new ForwardEngine(builder, ContextAssembler, claude, state)
  } catch {
    // Claude CLI not available — use fallback
    forwardEngine = new ForwardEngine(
      {
        async build() {
          return []
        },
      } as any,
      ContextAssembler,
      {
        async call() {
          return {
            say: 'Claude CLI 未找到，请确保已安装并登录 Claude Code。',
            play: [],
            reason: '',
            segue: '',
          }
        },
      } as any,
      state
    )
  }

  // Register API routes with real dependencies
  await app.register(
    createChatRoutes({
      forwardEngine,
      tts,
      state,
    })
  )

  await app.register(createNowRoutes({ state }))
  await app.register(createNextRoutes({ state, ncm }))
  await app.register(createTasteRoutes({ userDir, state }))
  await app.register(createPlanRoutes({ state }))
  await app.register(createSearchRoutes({ ncm }))
  await app.register(createSongUrlRoutes({ ncm }))
  await app.register(createPlayRoutes({ state, ncm }))

  // WebSocket routes with real forward engine
  await app.register(
    createWsRoutes({
      onChatMessage: async (msg, socket) => {
        try {
          const result = await forwardEngine.forward({ userMessage: msg.message })
          const ttsPath = await tts.speak(result.say)
          socket.send(
            JSON.stringify({
              type: 'assistant',
              say: result.say,
              play: result.play,
              tts: ttsPath,
            })
          )
          state.saveMessage('user', msg.message)
          if (result.say) state.saveMessage('assistant', result.say)
        } catch {
          socket.send(JSON.stringify({ type: 'error', message: '处理失败' }))
        }
      },
      onPlay: async (msg, socket) => {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Play via WebSocket is not yet supported — use the search bar instead',
        }))
      },
      onPause: async (msg, socket) => {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Pause via WebSocket is not yet supported — use the player controls',
        }))
      },
      onNext: async (msg, socket) => {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Next via WebSocket is not yet supported — use the player controls',
        }))
      },
    })
  )

  // Serve PWA static files
  app.get('/manifest.json', async () => {
    const manifest = {
      name: 'Claudio — AI 电台',
      short_name: 'Claudio',
      start_url: '/',
      display: 'standalone',
      theme_color: '#1a1a2e',
      background_color: '#1a1a2e',
      icons: [
        {
          src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="%231a1a2e"/><text x="96" y="120" font-size="100" text-anchor="middle" fill="%23e94560">🎵</text></svg>'),
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    }
    return manifest
  })

  app.get('/sw.js', async () => {
    const swPath = join(process.cwd(), 'src', 'pwa', 'sw.js')
    const sw = readFileSync(swPath, 'utf-8')
    return new Response(sw, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache',
      },
    })
  })

  // Serve PWA files with path-traversal protection
  const pwaDir = resolve(process.cwd(), 'src', 'pwa')
  const pwaDirResolved = pwaDir + sep
  app.get('/*', async (request) => {
    let url = request.url.replace(/^\//, '') || 'index.html'
    // Strip query string if any
    url = url.split('?')[0]
    const filePath = resolve(pwaDir, url)

    // Ensure the resolved path is inside pwaDir
    if (!filePath.startsWith(pwaDirResolved) && filePath !== pwaDir) {
      return new Response('Forbidden', { status: 403 })
    }

    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 })
    }

    const ext = url.split('.').pop() || 'html'
    const contentType: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
    }

    const content = readFileSync(filePath, 'utf-8')
    return new Response(content, {
      headers: {
        'Content-Type': contentType[ext] || 'text/plain',
        'Cache-Control': ext === 'js' ? 'no-cache' : 'public, max-age=3600',
      },
    })
  })

  return { app, config }
}

// Only auto-start when this file is executed directly (not imported by tests)
// Detect direct execution by comparing the resolved path of this module
// against the first CLI argument. Fall back to argv check for tsx dev mode.
const isDirectRun = () => {
  try {
    const modulePath = fileURLToPath(import.meta.url)
    return process.argv[1] && resolve(process.argv[1]) === modulePath
  } catch {
    // Fallback for environments where fileURLToPath or resolve fails
    return process.argv[1]?.includes('index.ts') ?? false
  }
}

if (isDirectRun()) {
  const { app, config } = await buildServer({ logger: true })
  await app.listen({ port: config.port, host: config.host })
  console.log(`Claudio running at http://${config.host}:${config.port}`)
}
