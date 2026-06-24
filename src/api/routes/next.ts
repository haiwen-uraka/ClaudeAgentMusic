// GET /api/next — playback queue

import { FastifyPluginAsync } from 'fastify'
import type { StateDB } from '../../brain/state.db.js'
import { NeteaseCloudMusicApi } from '../../services/ncm.js'

export interface NextDeps {
  state: StateDB
  ncm?: NeteaseCloudMusicApi
}

export function createNextRoutes(deps: NextDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/next', async () => {
      // Return recent plays as the "up next" queue for now
      const recent = deps.state.recentPlays(10)
      const queue = recent.map((p) => ({
        id: p.songId,
        title: p.title,
        artist: p.artist,
      }))
      return { queue }
    })
  }
}
