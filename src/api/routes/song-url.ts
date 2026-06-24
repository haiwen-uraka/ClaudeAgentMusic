// GET /api/song/url — get playable song URL

import { FastifyPluginAsync } from 'fastify'
import { NeteaseCloudMusicApi } from '../../services/ncm.js'

export interface SongUrlDeps {
  ncm: NeteaseCloudMusicApi
}

export function createSongUrlRoutes(deps: SongUrlDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/song/url', async (request) => {
      const id = (request.query as any).id as string
      if (!id) {
        return { url: '', isTrial: false, trialEnd: 0 }
      }
      const result = await deps.ncm.getSongUrl(id)
      return result
    })
  }
}
