import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('GET /api/taste', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return user taste profile', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/taste' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('taste')
    expect(body).toHaveProperty('routines')
    expect(body).toHaveProperty('stats')
  })
})
