// Global test setup — mock execa so integration tests don't try to spawn Claude CLI
import { vi } from 'vitest'

vi.mock('execa', () => ({
  execa: vi.fn(() =>
    Promise.resolve({
      stdout: JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify({
          say: 'Test response from mocked Claude',
          play: [],
          reason: '',
          segue: '',
        })}],
      }),
      exitCode: 0,
    })
  ),
}))
