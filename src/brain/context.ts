// ContextAssembler — combines 6 prompt fragments into a single system prompt

import type { PromptFragment } from '../model/fragments.js'

export class ContextAssembler {
  static assemble(fragments: PromptFragment[]): string {
    if (fragments.length === 0) return ''

    // Sort by id to ensure correct order
    const sorted = [...fragments].sort((a, b) => a.id - b.id)

    const sections = sorted
      .map((f) => {
        const header = `## ${f.label}`
        const body = f.content.trim()
        if (!body) return ''
        return `${header}\n${body}`
      })
      .filter(Boolean)

    return sections.join('\n\n')
  }
}
