import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index.js'

describe('GET /api/song/url', () => {
  let app: Awaited<ReturnType<typeof buildServer>>['app']

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return song URL for valid id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/song/url?id=86369' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('url')
    expect(body).toHaveProperty('isTrial')
  })

  it('should return empty url for missing id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/song/url' })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.url).toBe('')
  })
})
