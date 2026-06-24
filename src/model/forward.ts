// ForwardEngine — the "forward pass": fragments → context → Claude → structured output

import { ContextAssembler } from '../brain/context.js'
import type { PromptFragment } from './fragments.js'
import type { ClaudeAdapter } from '../brain/claude-adapter.js'
import type { StateDB } from '../brain/state.db.js'
import type { PlayRecord } from '../brain/state.db.js'

export interface ForwardInput {
  userMessage: string
}

export interface ForwardOutput {
  say: string
  play: Array<{ id: string; title: string; artist: string }>
  reason: string
  segue: string
  fallback: boolean
}

export class ForwardEngine {
  constructor(
    private readonly builder: {
      build(opts: {
        userMessage?: string
        recentPlays?: PlayRecord[]
      }): PromptFragment[]
    },
    private readonly assembler: typeof ContextAssembler,
    private readonly claude: ClaudeAdapter,
    private readonly state: StateDB,
  ) {}

  async forward(input: ForwardInput): Promise<ForwardOutput> {
    try {
      // 1. Get recent plays for memory fragment
      const recentPlays = this.state.recentPlays(10)

      // 2. Build 6 fragments
      const fragments = this.builder.build({
        userMessage: input.userMessage,
        recentPlays,
      })

      // 3. Assemble into system prompt
      const systemPrompt = this.assembler.assemble(fragments)

      // 4. Call Claude
      const response = await this.claude.call(systemPrompt, input.userMessage)

      // 5. Log plays to state
      for (const track of response.play) {
        this.state.logPlay(track.id, track.title, track.artist)
      }

      return {
        say: response.say,
        play: response.play,
        reason: response.reason,
        segue: response.segue,
        fallback: false,
      }
    } catch (error) {
      // Graceful degradation
      return {
        say: '稍等一下，我还在学习中...',
        play: [],
        reason: '',
        segue: '',
        fallback: true,
      }
    }
  }
}
