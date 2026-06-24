import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('GET /api/plan/today', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return today plan', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/plan/today' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('date')
    expect(body).toHaveProperty('slots')
    expect(Array.isArray(body.slots)).toBe(true)
  })
})
