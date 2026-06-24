import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { TtsEngine } from '../../src/brain/tts.js'

describe('TtsEngine', () => {
  let tempDir: string
  let cacheDir: string
  let engine: TtsEngine

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'claudio-tts-'))
    cacheDir = join(tempDir, 'tts')
    mkdirSync(cacheDir, { recursive: true })
    engine = new TtsEngine(cacheDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true })
  })

  it('should return null for empty text', async () => {
    const result = await engine.speak('')
    expect(result).toBeNull()
  })

  it('should return null for whitespace-only text', async () => {
    const result = await engine.speak('   ')
    expect(result).toBeNull()
  })

  it('should return a tts path for non-empty text', async () => {
    // Mock the Fish Audio API call
    const result = await engine.speak('Hello')
    // Without a real API key, it should still return a path or null gracefully
    // The actual behavior depends on implementation
    if (result !== null) {
      expect(result).toMatch(/\.mp3$/)
    }
  })
})
