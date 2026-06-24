// UserProfile — loads taste, routines, mood-rules, playlists from user/ directory

import { readFileSync, existsSync } from 'fs'

export interface UserProfileData {
  taste: string
  routines: string
  moodRules: string
  playlists: unknown[]
}

export class UserProfile {
  constructor(private readonly userDir: string) {}

  load(): UserProfileData {
    return {
      taste: this.readFile('taste.md'),
      routines: this.readFile('routines.md'),
      moodRules: this.readFile('mood-rules.md'),
      playlists: this.readPlaylists(),
    }
  }

  private readFile(filename: string): string {
    const path = this.resolve(filename)
    if (!existsSync(path)) return ''
    try {
      return readFileSync(path, 'utf-8')
    } catch {
      return ''
    }
  }

  private readPlaylists(): unknown[] {
    const path = this.resolve('playlists.json')
    if (!existsSync(path)) return []
    try {
      const raw = readFileSync(path, 'utf-8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private resolve(filename: string): string {
    return `${this.userDir}/${filename}`
  }
}
