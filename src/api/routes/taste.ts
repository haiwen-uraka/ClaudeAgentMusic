// GET /api/taste — user taste profile

import { FastifyPluginAsync } from 'fastify'
import { readFileSync, existsSync } from 'fs'
import { UserProfile } from '../../user/profile.js'
import type { StateDB } from '../../brain/state.db.js'

export interface TasteDeps {
  userDir: string
  state: StateDB
}

export function createTasteRoutes(deps: TasteDeps): FastifyPluginAsync {
  // UserProfile files rarely change; create once at route registration.
  const profile = new UserProfile(deps.userDir).load()

  return async (app) => {
    app.get('/api/taste', async () => {
      const recentPlays = deps.state.recentPlays(100)

      // Calculate genre stats from plays
      const artistCount = new Map<string, number>()
      for (const play of recentPlays) {
        const count = artistCount.get(play.artist) ?? 0
        artistCount.set(play.artist, count + 1)
      }
      const sortedArtists = [...artistCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist]) => artist)

      return {
        taste: profile.taste,
        routines: profile.routines,
        moodRules: profile.moodRules,
        recentGenres: sortedArtists,
        stats: {
          totalPlays: recentPlays.length,
          favoriteArtist: sortedArtists[0] ?? '',
        },
      }
    })
  }
}
