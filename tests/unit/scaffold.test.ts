import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('project scaffold', () => {
  it('package.json should have a valid semver version', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.name).toBe('claudio')
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(pkg.type).toBe('module')
  })

  it('should define engine node >= 20', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.engines.node).toMatch(/>=20/)
  })
})
