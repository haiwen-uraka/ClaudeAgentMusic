import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaudeAdapter, ClaudeResponse } from '../../src/brain/claude-adapter.js'

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}))

import { execa } from 'execa'

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new ClaudeAdapter()
  })

  const mockResponse: ClaudeResponse = {
    say: '早上好！给你来点温暖的民谣。',
    play: [{ id: '1', title: '晴天', artist: '周杰伦' }],
    reason: '早上 + 晴天 → 轻快民谣',
    segue: '接下来是七里香，也是周杰伦的经典。',
  }

  it('should call claude CLI with correct args', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      }),
      exitCode: 0,
    } as any)

    await adapter.call('system prompt', 'user message')

    expect(execa).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', '--output', 'json', '--max-turns', '1']),
      expect.objectContaining({ timeout: 30000, reject: true })
    )
  })

  it('should parse Claude JSON response', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      }),
      exitCode: 0,
    } as any)

    const result = await adapter.call('system', 'message')
    expect(result.say).toBe(mockResponse.say)
    expect(result.play).toHaveLength(1)
    expect(result.play[0].title).toBe('晴天')
    expect(result.reason).toBe(mockResponse.reason)
  })

  it('should throw ClaudeTimeoutError on timeout', async () => {
    const timeoutError = new Error('Command timed out')
    ;(timeoutError as any).name = 'ExecaTimeoutError'
    vi.mocked(execa).mockRejectedValue(timeoutError)

    await expect(adapter.call('system', 'message')).rejects.toThrow('Claude call timed out')
  })

  it('should throw ClaudeParseError on invalid JSON', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'this is not json',
      exitCode: 0,
    } as any)

    await expect(adapter.call('system', 'message')).rejects.toThrow('Claude returned non-JSON output')
  })

  it('should throw ClaudeNotFoundError when claude binary missing', async () => {
    const notFoundError = new Error('ENOENT: no such file or directory')
    ;(notFoundError as any).code = 'ENOENT'
    vi.mocked(execa).mockRejectedValue(notFoundError)

    await expect(adapter.call('system', 'message')).rejects.toThrow('Claude CLI not found')
  })
})
