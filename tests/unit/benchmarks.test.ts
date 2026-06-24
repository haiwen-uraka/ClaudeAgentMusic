import { describe, it, expect } from 'vitest'

describe('Performance Benchmarks', () => {
  it('benchmark: StateDB logPlay + recentPlays', async () => {
    const { StateDB } = await import('../../src/brain/state.db.js')
    const betterSqlite3 = await import('better-sqlite3')
    const db = new StateDB(new betterSqlite3.default(':memory:'))

    for (let i = 0; i < 1000; i++) {
      db.logPlay(`song_${i}`, `Title ${i}`, `Artist ${i % 10}`)
    }

    const start = Date.now()
    const recent = db.recentPlays(20)
    const elapsed = Date.now() - start

    expect(recent).toHaveLength(20)
    expect(elapsed).toBeLessThan(50) // < 50ms
  })

  it('benchmark: FragmentsBuilder.build()', async () => {
    const { FragmentsBuilder } = await import('../../src/model/fragments.js')
    const builder = new FragmentsBuilder('.')

    const start = Date.now()
    for (let i = 0; i < 100; i++) {
      builder.build({
        userMessage: 'Recommend a song',
        recentPlays: [
          { id: 1, songId: '1', title: 'Song', artist: 'Artist', playedAt: '' },
        ],
      })
    }
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(200) // < 200ms for 100 iterations
  })

  it('benchmark: ContextAssembler.assemble()', async () => {
    const { ContextAssembler } = await import('../../src/brain/context.js')
    const { FragmentsBuilder } = await import('../../src/model/fragments.js')
    const builder = new FragmentsBuilder('.')
    const fragments = builder.build({ userMessage: 'hello' })

    const start = Date.now()
    for (let i = 0; i < 1000; i++) {
      ContextAssembler.assemble(fragments)
    }
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(100) // < 100ms for 1000 iterations
  })
})
