// ClaudeAdapter — spawns `claude -p` as a subprocess and parses the JSON response

import { execa } from 'execa'

export interface ClaudeResponse {
  say: string
  play: Array<{ id: string; title: string; artist: string }>
  reason: string
  segue: string
}

export class ClaudeTimeoutError extends Error {
  constructor(message = 'Claude call timed out') {
    super(message)
    this.name = 'ClaudeTimeoutError'
  }
}

export class ClaudeParseError extends Error {
  constructor(message = 'Failed to parse Claude response') {
    super(message)
    this.name = 'ClaudeParseError'
  }
}

export class ClaudeNotFoundError extends Error {
  constructor(message = 'Claude CLI not found') {
    super(message)
    this.name = 'ClaudeNotFoundError'
  }
}

export class ClaudeAdapter {
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor(timeoutMs = 30000, maxRetries = 1) {
    this.timeoutMs = timeoutMs
    this.maxRetries = maxRetries
  }

  async call(systemPrompt: string, userInput: string): Promise<ClaudeResponse> {
    const prompt = this.buildPrompt(systemPrompt, userInput)

    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await execa('claude', [
          '-p',
          '--output', 'json',
          '--max-turns', '1',
          prompt,
        ], {
          timeout: this.timeoutMs,
          reject: true,
        })

        return this.parseResponse(result.stdout)
      } catch (error) {
        lastError = error as Error

        if (this.isTimeoutError(error)) {
          throw new ClaudeTimeoutError()
        }
        if (this.isNotFoundError(error)) {
          throw new ClaudeNotFoundError()
        }
        if (this.isParseError(error)) {
          // Parse errors are not retryable
          throw error
        }
        // Other errors: retry
      }
    }

    throw new Error(`Claude call failed after ${this.maxRetries + 1} attempts: ${lastError!.message}`)
  }

  private buildPrompt(system: string, user: string): string {
    return `${system}\n\nUser: ${user}`
  }

  private parseResponse(stdout: string): ClaudeResponse {
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(stdout)
    } catch {
      throw new ClaudeParseError('Claude returned non-JSON output')
    }

    // Extract text from content array
    let text = ''
    if (Array.isArray(parsed.content)) {
      for (const item of parsed.content) {
        if (item.type === 'text') {
          text += item.text
        }
      }
    } else if (typeof parsed.content === 'string') {
      text = parsed.content
    }

    // Extract JSON from the text response — look for a complete JSON object
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/)
    if (!jsonMatch) {
      throw new ClaudeParseError('No JSON found in Claude response')
    }

    try {
      return JSON.parse(jsonMatch[0]) as ClaudeResponse
    } catch {
      throw new ClaudeParseError('Failed to parse JSON from Claude text response')
    }
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as any).name === 'ExecaTimeoutError' ||
      (error as any).message?.includes('timeout')
    )
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      ((error as any).code === 'ENOENT' ||
        (error as any).message?.includes('not found'))
    )
  }

  private isParseError(error: unknown): boolean {
    return error instanceof ClaudeParseError
  }
}
