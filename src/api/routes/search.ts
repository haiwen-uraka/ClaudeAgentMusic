// GET /api/search — search songs via NeteaseCloudMusicApi

import { FastifyPluginAsync } from 'fastify'
import { NeteaseCloudMusicApi } from '../../services/ncm.js'

export interface SearchDeps {
  ncm: NeteaseCloudMusicApi
}

export function createSearchRoutes(deps: SearchDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/search', async (request) => {
      const query = (request.query as any).q as string || ''
      if (!query.trim()) {
        return { results: [] }
      }

      const results = await deps.ncm.search(query, 10)
      return { results }
    })
  }
}
