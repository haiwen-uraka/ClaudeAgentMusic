// GET /api/plan/today — daily schedule plan

import { FastifyPluginAsync } from 'fastify'
import type { StateDB } from '../../brain/state.db.js'

export interface PlanDeps {
  state: StateDB
}

export function createPlanRoutes(deps: PlanDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/api/plan/today', async () => {
      const today = new Date().toISOString().slice(0, 10)
      const slots = deps.state.getPlan(today)
      return {
        date: today,
        slots,
      }
    })
  }
}
