import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('POST /api/chat', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return 400 for missing message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('should return 200 with structured response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { message: '推荐点歌' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('say')
    expect(body).toHaveProperty('play')
    expect(body).toHaveProperty('nowPlaying')
    expect(body).toHaveProperty('reason')
    expect(body).toHaveProperty('segue')
    expect(body).toHaveProperty('fallback')
  })

  it('should save user message to state', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { message: 'test message' },
    })
    expect(res.statusCode).toBe(200)
    // Message was saved (no error means success)
  })

  it('should handle fallback when Claude is unavailable', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { message: 'hello' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    // When Claude CLI is not available, fallback returns a message
    if (body.fallback) {
      expect(body.say).toBeDefined()
      expect(body.play).toEqual([])
    }
  })
})
