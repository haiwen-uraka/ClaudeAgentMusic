import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('PWA Shell', () => {
  const pwaDir = join(process.cwd(), 'src', 'pwa')

  it('should have index.html', () => {
    expect(existsSync(join(pwaDir, 'index.html'))).toBe(true)
  })

  it('should have style.css', () => {
    expect(existsSync(join(pwaDir, 'style.css'))).toBe(true)
  })

  it('should have app.js', () => {
    expect(existsSync(join(pwaDir, 'app.js'))).toBe(true)
  })

  it('should have sw.js (service worker)', () => {
    expect(existsSync(join(pwaDir, 'sw.js'))).toBe(true)
  })

  it('index.html should have manifest link', () => {
    const html = readFileSync(join(pwaDir, 'index.html'), 'utf-8')
    expect(html).toContain('manifest')
  })

  it('index.html should have service worker registration script', () => {
    const html = readFileSync(join(pwaDir, 'index.html'), 'utf-8')
    expect(html).toContain('sw.js')
  })

  it('sw.js should have cache name', () => {
    const sw = readFileSync(join(pwaDir, 'sw.js'), 'utf-8')
    expect(sw).toContain('CACHE_NAME')
  })

  it('sw.js should handle install event', () => {
    const sw = readFileSync(join(pwaDir, 'sw.js'), 'utf-8')
    expect(sw).toContain("addEventListener('install'")
  })

  it('sw.js should handle fetch event', () => {
    const sw = readFileSync(join(pwaDir, 'sw.js'), 'utf-8')
    expect(sw).toContain("addEventListener('fetch'")
  })
})
