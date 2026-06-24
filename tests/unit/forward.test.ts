import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForwardEngine, ForwardInput } from '../../src/model/forward.js'
import { FragmentsBuilder } from '../../src/model/fragments.js'
import { ContextAssembler } from '../../src/brain/context.js'
import type { ClaudeAdapter } from '../../src/brain/claude-adapter.js'
import { StateDB } from '../../src/brain/state.db.js'
import { ClaudeResponse } from '../../src/brain/claude-adapter.js'
import Database from 'better-sqlite3'

describe('ForwardEngine', () => {
  let db: StateDB
  let builder: FragmentsBuilder
  let mockAdapter: { call: ReturnType<typeof vi.fn> }
  let engine: ForwardEngine

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = new StateDB(sqlite)
    builder = new FragmentsBuilder('.')
    mockAdapter = { call: vi.fn() }
    engine = new ForwardEngine(builder, ContextAssembler, mockAdapter as any, db)
  })

  const mockClaudeResponse: ClaudeResponse = {
    say: '早上好！来点温暖的民谣。',
    play: [
      { id: 'song_1', title: '晴天', artist: '周杰伦' },
    ],
    reason: '早上 + 晴天 → 轻快民谣',
    segue: '接下来是七里香。',
  }

  it('should assemble fragments, call claude, and return structured output', async () => {
    mockAdapter.call.mockResolvedValue(mockClaudeResponse)

    const input: ForwardInput = {
      userMessage: '找点适合早上听的歌',
    }

    const result = await engine.forward(input)

    expect(mockAdapter.call).toHaveBeenCalledTimes(1)
    expect(result.say).toBe(mockClaudeResponse.say)
    expect(result.play).toHaveLength(1)
    expect(result.play[0].title).toBe('晴天')
    expect(result.reason).toBe(mockClaudeResponse.reason)
  })

  it('should include recent plays in the assembled prompt', async () => {
    mockAdapter.call.mockResolvedValue(mockClaudeResponse)
    db.logPlay('prev_1', 'Yesterday', 'Someone')

    const input: ForwardInput = {
      userMessage: '推荐一首歌',
    }

    await engine.forward(input)

    const callArg = mockAdapter.call.mock.calls[0]
    const systemPrompt = callArg[0]
    expect(systemPrompt).toContain('Yesterday')
  })

  it('should log played songs to state.db', async () => {
    mockAdapter.call.mockResolvedValue(mockClaudeResponse)

    const input: ForwardInput = {
      userMessage: '推荐',
    }

    await engine.forward(input)

    const recent = db.recentPlays(5)
    expect(recent).toHaveLength(1)
    expect(recent[0].title).toBe('晴天')
  })

  it('should return fallback when claude throws', async () => {
    mockAdapter.call.mockRejectedValue(new Error('Claude down'))

    const input: ForwardInput = {
      userMessage: '推荐',
    }

    const result = await engine.forward(input)

    expect(result.say).toBe('稍等一下，我还在学习中...')
    expect(result.play).toEqual([])
    expect(result.fallback).toBe(true)
  })
})
