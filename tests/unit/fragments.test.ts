import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { FragmentsBuilder } from '../../src/model/fragments.js'

describe('FragmentsBuilder', () => {
  let tempDir: string
  let builder: FragmentsBuilder

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'claudio-fragments-'))
    mkdirSync(join(tempDir, 'prompts'), { recursive: true })
    mkdirSync(join(tempDir, 'user'), { recursive: true })
    // Write fixture files BEFORE constructing FragmentsBuilder
    // because the constructor now caches file contents.
    writeFileSync(join(tempDir, 'prompts', 'dj-persona.md'), 'You are Claudio.')
    writeFileSync(join(tempDir, 'user', 'taste.md'), 'I love jazz')
    writeFileSync(join(tempDir, 'user', 'routines.md'), '07:00 wake up')
    writeFileSync(join(tempDir, 'user', 'mood-rules.md'), 'rainy → jazz')
    builder = new FragmentsBuilder(tempDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true })
  })

  it('should return 6 fragments', () => {
    const fragments = builder.build({})
    expect(fragments).toHaveLength(6)
  })

  it('fragment 1 should be the system prompt', () => {
    const fragments = builder.build({})
    const sys = fragments.find(f => f.id === 1)
    expect(sys).toBeDefined()
    expect(sys!.label).toBe('系统提示词')
    expect(sys!.content).toContain('You are Claudio')
  })

  it('fragment 2 should contain user taste data', () => {
    const fragments = builder.build({})
    const user = fragments.find(f => f.id === 2)
    expect(user).toBeDefined()
    expect(user!.content).toContain('I love jazz')
    expect(user!.content).toContain('07:00 wake up')
    expect(user!.content).toContain('rainy → jazz')
  })

  it('fragment 4 should contain recent plays from state', () => {
    const fragments = builder.build({
      recentPlays: [
        { id: 1, songId: '1', title: 'Song A', artist: 'Artist A', playedAt: '' },
        { id: 2, songId: '2', title: 'Song B', artist: 'Artist B', playedAt: '' },
      ],
    })
    const memory = fragments.find(f => f.id === 4)
    expect(memory).toBeDefined()
    expect(memory!.content).toContain('Song A')
    expect(memory!.content).toContain('Song B')
  })

  it('fragment 5 should contain user message', () => {
    const fragments = builder.build({
      userMessage: 'play some jazz',
    })
    const input = fragments.find(f => f.id === 5)
    expect(input).toBeDefined()
    expect(input!.content).toContain('play some jazz')
  })

  it('fragment 6 should contain scheduler info', () => {
    const fragments = builder.build({
      schedulerInfo: 'morning routine at 07:00',
    })
    const exec = fragments.find(f => f.id === 6)
    expect(exec).toBeDefined()
    expect(exec!.content).toContain('morning routine at 07:00')
  })

  it('fragment 3 should include weather when provided', () => {
    const fragments = builder.build({
      weather: 'Beijing, 22°C, cloudy',
      now: '2026-06-23 08:00',
    })
    const env = fragments.find(f => f.id === 3)
    expect(env).toBeDefined()
    expect(env!.content).toContain('Beijing')
    expect(env!.content).toContain('2026-06-23')
  })

  it('fragment 3 should be empty string when no env data', () => {
    const fragments = builder.build({})
    const env = fragments.find(f => f.id === 3)
    expect(env).toBeDefined()
    expect(env!.content).toBe('')
  })
})
