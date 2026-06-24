// GET /api/now — current playing status

import { FastifyPluginAsync } from 'fastify'
import type { StateDB } from '../../brain/state.db.js'
import type { PlayRecord } from '../../brain/state.db.js'

export interface NowDeps {
  state: StateDB
}

export function createNowRoutes(deps: NowDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/now', async () => {
      const recent: PlayRecord[] = deps.state.recentPlays(1)
      const latest = recent[0]
      const nowPlaying = latest
        ? {
            id: latest.songId,
            title: latest.title,
            artist: latest.artist,
          }
        : null

      return {
        nowPlaying,
        tts: null,
        isPlaying: !!nowPlaying,
        progress: 0,
      }
    })
  }
}
