import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Settings View', () => {
  const html = readFileSync(join(process.cwd(), 'src', 'pwa', 'index.html'), 'utf-8')
  const js = readFileSync(join(process.cwd(), 'src', 'pwa', 'app.js'), 'utf-8')

  it('should have theme toggle', () => {
    expect(html).toContain('theme-toggle')
  })

  it('should have volume slider', () => {
    expect(html).toContain('id="volume"')
  })

  it('app.js should persist settings to localStorage', () => {
    expect(js).toContain('localStorage.setItem')
  })

  it('app.js should load settings from localStorage', () => {
    expect(js).toContain('localStorage.getItem')
  })

  it('should have profile modal', () => {
    expect(html).toContain('id="profile-overlay"')
  })

  it('profile modal should have genre tags', () => {
    expect(html).toContain('profile-tags')
  })
})
