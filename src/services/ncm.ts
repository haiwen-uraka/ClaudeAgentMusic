// NeteaseCloudMusicApi client

export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  cover?: string
  duration?: number
  isTrial?: boolean
  trialEnd?: number
}

export interface Playlist {
  id: string
  name: string
  tracks: Song[]
}

export class NeteaseCloudMusicApi {
  constructor(private readonly baseUrl: string) {}

  private async request(path: string): Promise<Record<string, any>> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      headers: {
        'Referer': this.baseUrl,
      },
    })
    if (!res.ok) {
      throw new Error(`NCM API request failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as Record<string, any>
  }

  async search(query: string, limit = 10): Promise<Song[]> {
    const data = await this.request(`/search?keywords=${encodeURIComponent(query)}&limit=${limit}`)
    const songs = data.result?.songs ?? []
    return songs.map((s: any) => ({
      id: String(s.id),
      title: s.name,
      artist: s.artists?.map((a: any) => a.name).join(', ') ?? '',
      album: s.album?.name,
      cover: s.album?.picUrl,
      duration: s.duration,
    }))
  }

  async getSongUrl(id: string): Promise<{ url: string; isTrial: boolean; trialEnd: number }> {
    const data = await this.request(`/song/url?id=${id}`)
    const song = data.data?.[0]
    if (!song?.url) {
      return { url: '', isTrial: false, trialEnd: 0 }
    }

    const trialInfo = song.freeTrialInfo
    const isTrial = !!(trialInfo && trialInfo.end > 0)
    // NCM API returns end/start as Unix timestamps in ms.
    // Convert duration from ms to seconds for the frontend player.
    const trialEnd = isTrial ? Math.round((trialInfo.end - trialInfo.start) / 1000) : 0

    return {
      url: song.url,
      isTrial,
      trialEnd,
    }
  }

  async getPlaylist(id: string): Promise<Playlist | null> {
    const data = await this.request(`/playlist/detail?id=${id}`)
    const playlist = data.playlist
    if (!playlist) return null

    return {
      id: String(playlist.id),
      name: playlist.name,
      tracks: (playlist.tracks ?? []).map((s: any) => ({
        id: String(s.id),
        title: s.name,
        artist: s.artists?.map((a: any) => a.name).join(', ') ?? '',
        album: s.album?.name,
        cover: s.album?.picUrl,
        duration: s.duration,
      })),
    }
  }

  async getLyric(id: string): Promise<string> {
    const data = await this.request(`/lyric?id=${id}`)
    return data.lrc?.lyric ?? ''
  }
}
