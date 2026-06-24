import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Player View', () => {
  const html = readFileSync(join(process.cwd(), 'src', 'pwa', 'index.html'), 'utf-8')

  it('should have now playing title element', () => {
    expect(html).toContain('id="np-title"')
  })

  it('should have now playing artist element', () => {
    expect(html).toContain('id="np-artist"')
  })

  it('should have progress bar', () => {
    expect(html).toContain('id="progress-fill"')
  })

  it('should have audio player element', () => {
    expect(html).toContain('id="audio-player"')
  })

  it('should have time display', () => {
    expect(html).toContain('id="time-current"')
    expect(html).toContain('id="time-total"')
  })

  it('should have next button', () => {
    expect(html).toContain('id="btn-next"')
  })

  it('should have play/pause button', () => {
    expect(html).toContain('id="btn-play-pause"')
  })

  it('should have volume control', () => {
    expect(html).toContain('id="volume"')
  })

  it('should have clock element', () => {
    expect(html).toContain('id="clock"')
  })

  it('should have equalizer animation', () => {
    expect(html).toContain('id="equalizer"')
  })
})
