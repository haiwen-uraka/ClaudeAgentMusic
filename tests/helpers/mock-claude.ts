// Claude Mock - helpers for testing without real Claude CLI

import { vi } from 'vitest'

export interface MockClaudeResponse {
  say: string
  play: Array<{ id: string; title: string; artist: string }>
  reason: string
  segue: string
}

export const MOCK_CLAUDE_RESPONSE: MockClaudeResponse = {
  say: 'Good morning! Let me play some warm folk music.',
  play: [
    { id: 'mock_1', title: 'Sunny Day', artist: 'Jay Chou' },
    { id: 'mock_2', title: 'Chengdu', artist: 'Zhao Lei' },
  ],
  reason: 'Morning + cloudy -> warm folk',
  segue: 'Next up is another classic.',
}

export function mockClaude(response: MockClaudeResponse = MOCK_CLAUDE_RESPONSE) {
  vi.mock('execa', () => ({
    execa: vi.fn(() =>
      Promise.resolve({
        stdout: JSON.stringify({
          content: [
            {
              type: 'text',
              text: JSON.stringify(response),
            },
          ],
        }),
        exitCode: 0,
      })
    ),
  }))
}

export function mockClaudeError(errorType: 'timeout' | 'notfound' | 'parse' = 'parse') {
  const errors: Record<string, Error> = {
    timeout: new Error('Command timed out'),
    notfound: new Error('ENOENT: no such file or directory'),
    parse: new Error('this is not json'),
  }

  vi.mock('execa', () => ({
    execa: vi.fn(() => Promise.reject(errors[errorType])),
  }))
}
