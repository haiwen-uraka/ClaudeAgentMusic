import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NeteaseCloudMusicApi } from '../../src/services/ncm.js'

describe('NeteaseCloudMusicApi', () => {
  let api: NeteaseCloudMusicApi
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    // @ts-ignore
    globalThis.fetch = mockFetch
    api = new NeteaseCloudMusicApi('http://localhost:3000')
  })

  it('should search songs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          songs: [
            { id: 1, name: '晴天', artists: [{ name: '周杰伦' }], album: { name: '叶惠美', picUrl: 'http://cover.jpg' }, duration: 296000 },
          ],
        },
      }),
    } as any)

    const results = await api.search('晴天')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('晴天')
    expect(results[0].artist).toBe('周杰伦')
  })

  it('should throw on search failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as any)

    await expect(api.search('nonexistent')).rejects.toThrow('NCM API request failed')
  })

  it('should get song URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ url: 'http://example.com/song.mp3' }],
      }),
    } as any)

    const result = await api.getSongUrl('1')
    expect(result.url).toBe('http://example.com/song.mp3')
    expect(result.isTrial).toBe(false)
  })

  it('should get playlist detail', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        playlist: {
          id: 123,
          name: 'My Playlist',
          tracks: [
            { id: 1, name: 'Song 1', artists: [{ name: 'Artist 1' }], album: { name: 'Album 1' }, duration: 200000 },
          ],
        },
      }),
    } as any)

    const playlist = await api.getPlaylist('123')
    expect(playlist?.name).toBe('My Playlist')
    expect(playlist?.tracks).toHaveLength(1)
  })
})
