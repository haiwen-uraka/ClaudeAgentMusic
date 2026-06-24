import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('End-to-End: Claudio Main Flow', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('health check should pass', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toEqual({ status: 'ok' })
  })

  it('PWA index.html should be served', async () => {
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
  })

  it('PWA CSS should be served', async () => {
    const res = await app.inject({ method: 'GET', url: '/style.css' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/css')
  })

  it('PWA JS should be served', async () => {
    const res = await app.inject({ method: 'GET', url: '/app.js' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('javascript')
  })

  it('Service Worker should be served', async () => {
    const res = await app.inject({ method: 'GET', url: '/sw.js' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('javascript')
  })

  it('manifest.json should be served', async () => {
    const res = await app.inject({ method: 'GET', url: '/manifest.json' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.name).toBe('Claudio — AI 电台')
    expect(body.display).toBe('standalone')
  })

  it('POST /api/chat should work end-to-end', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { message: '推荐点适合早上听的歌' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.say).toBeDefined()
    expect(body.play).toBeDefined()
    expect(body.nowPlaying).toBeDefined()
  })

  it('GET /api/taste should return user profile', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/taste' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.taste).toBeDefined()
    expect(body.stats).toBeDefined()
  })

  it('GET /api/now should return current playing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/now' })
    expect(res.statusCode).toBe(200)
  })

  it('GET /api/plan/today should return today plan', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/plan/today' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.date).toBeDefined()
    expect(body.slots).toEqual([])
  })
})
