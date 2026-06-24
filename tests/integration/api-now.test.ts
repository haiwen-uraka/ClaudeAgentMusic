import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('GET /api/now', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return current playing status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/now' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('nowPlaying')
    expect(body).toHaveProperty('isPlaying')
    expect(body).toHaveProperty('progress')
  })
})
