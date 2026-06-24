import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'
import WebSocket from 'ws'

describe('WebSocket /stream', () => {
  let serverUrl: string

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).__testServer = server

    // Listen on a real port for WebSocket testing
    await server.app.listen({ port: 0, host: '127.0.0.1' })
    // @ts-ignore
    const address = server.app.server.address()
    const port = typeof address === 'string' ? parseInt(address) : (address as any).port
    serverUrl = `ws://127.0.0.1:${port}`
  })

  afterAll(async () => {
    // @ts-ignore
    if ((globalThis as any).__testServer) {
      await (globalThis as any).__testServer.app.close()
    }
  })

  it('should connect and receive assistant message on chat', async () => {
    const ws = new WebSocket(serverUrl + '/stream')

    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('WS timeout after 5s'))
      }, 5000)

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'chat', message: 'hello' }))
      })

      ws.on('message', (data) => {
        clearTimeout(timeout)
        resolve(JSON.parse(data.toString()))
      })

      ws.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    expect(response).toHaveProperty('type')
    expect(response.type).toBe('assistant')
    ws.close()
  }, 10000)
})
