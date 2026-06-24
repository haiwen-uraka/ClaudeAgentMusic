import { describe, it, expect } from 'vitest'
import { NeteaseCloudMusicApi } from '../../src/services/ncm.js'

describe('NeteaseCloudMusicApi integration', () => {
  const api = new NeteaseCloudMusicApi('http://localhost:3000')

  it('should search for real songs', async () => {
    const results = await api.search('晴天', 3)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title).toBeDefined()
    expect(results[0].artist).toBeDefined()
  })

  it('should return song with id, title, artist', async () => {
    const results = await api.search('周杰伦', 1)
    if (results.length > 0) {
      expect(results[0].id).toBeDefined()
      expect(results[0].title.length).toBeGreaterThan(0)
    }
  })
})
