import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('GET /api/next', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return queue array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/next' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('queue')
    expect(Array.isArray(body.queue)).toBe(true)
  })
})
