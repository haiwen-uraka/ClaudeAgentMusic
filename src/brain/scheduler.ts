// Scheduler — cron-based task scheduling for morning plans, hourly checks, etc.

import { Cron } from 'croner'

export interface ScheduledTask {
  name: string
  cron: string
  handler: () => Promise<void>
}

export class Scheduler {
  private tasks = new Map<string, { cron: Cron; handler: () => Promise<void> }>()
  private running = false

  register(task: ScheduledTask): void {
    if (this.tasks.has(task.name)) {
      throw new Error(`Task "${task.name}" already registered`)
    }
    // Basic validation: standard cron has 5 fields (min hour dom month dow)
    const fields = task.cron.trim().split(/\s+/)
    if (fields.length !== 5) {
      throw new Error(`Invalid cron expression "${task.cron}": expected 5 fields, got ${fields.length}`)
    }
    const cron = new Cron(task.cron)
    this.tasks.set(task.name, { cron, handler: task.handler })
  }

  start(): void {
    if (this.running) return
    this.running = true

    for (const [name, { cron, handler }] of this.tasks) {
      cron.schedule(async () => {
        try {
          await handler()
        } catch (error) {
          console.error(`[Scheduler] Task "${name}" failed:`, error)
        }
      })
    }
  }

  stop(): void {
    this.running = false
    for (const [, { cron }] of this.tasks) {
      cron.stop()
    }
  }

  async trigger(name: string): Promise<void> {
    const task = this.tasks.get(name)
    if (!task) {
      throw new Error(`Unknown task: ${name}`)
    }
    await task.handler()
  }

  list(): string[] {
    return Array.from(this.tasks.keys())
  }
}
