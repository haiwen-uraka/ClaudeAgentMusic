import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Chat View', () => {
  const html = readFileSync(join(process.cwd(), 'src', 'pwa', 'index.html'), 'utf-8')

  it('should have chat messages container', () => {
    expect(html).toContain('id="chat-messages"')
  })

  it('should have chat input', () => {
    expect(html).toContain('id="chat-input"')
  })

  it('should have send button', () => {
    expect(html).toContain('id="send-btn"')
  })

  it('should have mic button', () => {
    expect(html).toContain('id="mic-btn"')
  })

  it('app.js should connect to WebSocket', () => {
    const js = readFileSync(join(process.cwd(), 'src', 'pwa', 'app.js'), 'utf-8')
    expect(js).toContain('/stream')
  })

  it('app.js should handle chat messages', () => {
    const js = readFileSync(join(process.cwd(), 'src', 'pwa', 'app.js'), 'utf-8')
    expect(js).toContain('appendMessage')
  })
})
