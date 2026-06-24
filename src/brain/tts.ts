// TtsEngine — Fish Audio TTS with local file cache

import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

export class TtsEngine {
  private readonly apiKey: string
  private readonly cacheDir: string

  constructor(cacheDir: string, apiKey = '') {
    this.cacheDir = cacheDir
    this.apiKey = apiKey
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
  }

  async speak(text: string): Promise<string | null> {
    const trimmed = text.trim()
    if (!trimmed) return null
    if (!this.apiKey) return null // No API key configured

    const hash = createHash('md5').update(trimmed).digest('hex')
    const filename = `${hash}.mp3`
    const filepath = join(this.cacheDir, filename)

    // Return cached file if exists
    if (existsSync(filepath)) {
      return filepath
    }

    // Call Fish Audio API
    try {
      const audioBuffer = await this.callFishAudio(trimmed)
      writeFileSync(filepath, audioBuffer)
      return filepath
    } catch (error) {
      console.error('[TtsEngine] Failed to synthesize speech:', error)
      return null
    }
  }

  async clearCache(): Promise<void> {
    const files = readdirSync(this.cacheDir)
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

    for (const file of files) {
      const filepath = join(this.cacheDir, file)
      const stats = statSync(filepath)
      if (now - stats.mtimeMs > maxAge) {
        try {
          unlinkSync(filepath)
        } catch {
          // ignore
        }
      }
    }
  }

  private async callFishAudio(text: string): Promise<Buffer> {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reference_id: 'default',
      }),
    })

    if (!response.ok) {
      throw new Error(`Fish Audio API error: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}
