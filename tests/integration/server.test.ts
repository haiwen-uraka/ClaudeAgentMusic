import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../src/index'

describe('server scaffold', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any

  beforeAll(async () => {
    const server = await buildServer({ logger: false })
    app = server.app
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health should return ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body).toEqual({ status: 'ok' })
  })
})
