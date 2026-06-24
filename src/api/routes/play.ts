// POST /api/play — log a play and get song URL

import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { NeteaseCloudMusicApi } from '../../services/ncm.js'
import type { StateDB } from '../../brain/state.db.js'

const playBodySchema = z.object({
  songId: z.string().min(1, 'songId is required'),
  title: z.string().max(500).optional().default(''),
  artist: z.string().max(500).optional().default(''),
})

export interface PlayDeps {
  state: StateDB
  ncm: NeteaseCloudMusicApi
}

export function createPlayRoutes(deps: PlayDeps): FastifyPluginAsync {
  return async (app) => {
    app.post('/api/play', async (request, reply) => {
      const parsed = playBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.message })
      }

      const { songId, title, artist } = parsed.data

      // Log the play
      deps.state.logPlay(songId, title, artist)

      // Get playable URL with trial info
      const result = await deps.ncm.getSongUrl(songId)

      return {
        url: result.url,
        isTrial: result.isTrial,
        trialEnd: result.trialEnd,
      }
    })
  }
}
