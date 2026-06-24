// POST /api/chat — send a message to Claudio

import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export interface ChatDependencies {
  forwardEngine: {
    forward(input: { userMessage: string }): Promise<{
      say: string
      play: Array<{ id: string; title: string; artist: string }>
      reason: string
      segue: string
      fallback: boolean
    }>
  }
  tts: {
    speak(text: string): Promise<string | null>
  }
  state: {
    saveMessage(role: 'user' | 'assistant', content: string): void
  }
}

export function createChatRoutes(deps: ChatDependencies): FastifyPluginAsync {
  const chatSchema = z.object({
    message: z.string().min(1, 'message is required'),
  })

  return async (app) => {
    app.post('/api/chat', async (request, reply) => {
      const parsed = chatSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.message })
      }

      const { message } = parsed.data
      const result = await deps.forwardEngine.forward({ userMessage: message })

      const ttsPath = await deps.tts.speak(result.say)

      deps.state.saveMessage('user', message)
      if (result.say) {
        deps.state.saveMessage('assistant', result.say)
      }

      const nowPlaying = result.play[0]
        ? {
            id: result.play[0].id,
            title: result.play[0].title,
            artist: result.play[0].artist,
            tts: ttsPath,
          }
        : null

      return {
        say: result.say,
        play: result.play,
        nowPlaying,
        reason: result.reason,
        segue: result.segue,
        fallback: result.fallback,
      }
    })
  }
}
