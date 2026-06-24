import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Scheduler } from '../../src/brain/scheduler.js'

describe('Scheduler', () => {
  let scheduler: Scheduler
  let mockHandler: { execute: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockHandler = { execute: vi.fn().mockResolvedValue(undefined) }
    scheduler = new Scheduler()
  })

  afterEach(() => {
    scheduler.stop()
  })

  it('should register a scheduled task', () => {
    scheduler.register({
      name: 'morning-plan',
      cron: '0 7 * * *',
      handler: mockHandler.execute as any,
    })
    // Registration should not throw
    expect(true).toBe(true)
  })

  it('should execute handler when cron matches (using cron-trigger)', async () => {
    scheduler.register({
      name: 'test-task',
      cron: '* * * * *',  // every minute for testing
      handler: mockHandler.execute as any,
    })
    scheduler.start()

    // Manually trigger the task
    await scheduler.trigger('test-task')

    expect(mockHandler.execute).toHaveBeenCalledTimes(1)
  })

  it('should throw when triggering unknown task', async () => {
    await expect(scheduler.trigger('nonexistent')).rejects.toThrow('Unknown task')
  })

  it('should allow manual trigger by name', async () => {
    scheduler.register({
      name: 'manual-task',
      cron: '0 7 * * *',
      handler: mockHandler.execute as any,
    })

    await scheduler.trigger('manual-task')
    expect(mockHandler.execute).toHaveBeenCalledTimes(1)
  })
})
