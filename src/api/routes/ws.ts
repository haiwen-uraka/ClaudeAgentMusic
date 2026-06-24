// WebSocket /stream — real-time bidirectional communication

import { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from '@fastify/websocket'

export interface WsDeps {
  onChatMessage: (msg: { message: string }, socket: WebSocket) => Promise<void>
  onPlay: (msg: { songId: string }, socket: WebSocket) => Promise<void>
  onPause: (msg: unknown, socket: WebSocket) => Promise<void>
  onNext: (msg: unknown, socket: WebSocket) => Promise<void>
}

export function createWsRoutes(deps: WsDeps): FastifyPluginAsync {
  return async (app) => {
    app.get(
      '/stream',
      { websocket: true },
      (socket: WebSocket) => {
        socket.on('message', async (raw: Buffer) => {
          try {
            const msg = JSON.parse(raw.toString())
            await handleMessage(socket, msg, deps)
          } catch {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
          }
        })

        socket.on('close', () => {
          // cleanup
        })
      }
    )
  }
}

async function handleMessage(
  socket: WebSocket,
  msg: Record<string, unknown>,
  deps: WsDeps,
): Promise<void> {
  switch (msg.type) {
    case 'chat':
      await deps.onChatMessage(
        { message: String(msg.message || '') },
        socket
      )
      break
    case 'play':
      await deps.onPlay({ songId: String(msg.songId || '') }, socket)
      break
    case 'pause':
      await deps.onPause(msg, socket)
      break
    case 'next':
      await deps.onNext(msg, socket)
      break
    default:
      socket.send(
        JSON.stringify({ type: 'error', message: `Unknown type: ${(msg as any).type}` })
      )
  }
}
