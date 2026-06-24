import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { UserProfile } from '../../src/user/profile.js'

describe('UserProfile', () => {
  let tempDir: string
  let profile: UserProfile

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'claudio-test-'))
    profile = new UserProfile(tempDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true })
  })

  describe('load', () => {
    it('should return empty object when no user files exist', () => {
      const result = profile.load()
      expect(result.taste).toBe('')
      expect(result.routines).toBe('')
      expect(result.moodRules).toBe('')
      expect(result.playlists).toEqual([])
    })

    it('should load taste.md content', () => {
      writeFileSync(join(tempDir, 'taste.md'), '# My Taste\nI love jazz and folk.')
      const result = profile.load()
      expect(result.taste).toBe('# My Taste\nI love jazz and folk.')
    })

    it('should load routines.md content', () => {
      writeFileSync(join(tempDir, 'routines.md'), '# Routines\n07:00 wake up')
      const result = profile.load()
      expect(result.routines).toBe('# Routines\n07:00 wake up')
    })

    it('should load mood-rules.md content', () => {
      writeFileSync(join(tempDir, 'mood-rules.md'), '# Mood\nrainy → jazz')
      const result = profile.load()
      expect(result.moodRules).toBe('# Mood\nrainy → jazz')
    })

    it('should load playlists.json as array', () => {
      const playlists = [{ name: 'Favorites', id: '123' }]
      writeFileSync(join(tempDir, 'playlists.json'), JSON.stringify(playlists))
      const result = profile.load()
      expect(result.playlists).toEqual(playlists)
    })

    it('should load all files together', () => {
      writeFileSync(join(tempDir, 'taste.md'), 'taste content')
      writeFileSync(join(tempDir, 'routines.md'), 'routines content')
      writeFileSync(join(tempDir, 'mood-rules.md'), 'mood content')
      writeFileSync(join(tempDir, 'playlists.json'), '[]')

      const result = profile.load()
      expect(result.taste).toBe('taste content')
      expect(result.routines).toBe('routines content')
      expect(result.moodRules).toBe('mood content')
      expect(result.playlists).toEqual([])
    })

    it('should return empty string for invalid JSON in playlists.json', () => {
      writeFileSync(join(tempDir, 'playlists.json'), 'not valid json')
      const result = profile.load()
      expect(result.playlists).toEqual([])
    })
  })

  describe('hot reload', () => {
    it('should reflect file changes on next load call', () => {
      writeFileSync(join(tempDir, 'taste.md'), 'initial')
      expect(profile.load().taste).toBe('initial')

      writeFileSync(join(tempDir, 'taste.md'), 'updated')
      expect(profile.load().taste).toBe('updated')
    })
  })
})
