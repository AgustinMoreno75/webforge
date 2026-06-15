import cron from 'node-cron'
import { config } from '../config.js'
import { processPlanLifecycle } from '../lib/accountService.js'

// Único job: ciclo de vida de planes (vencimientos + recordatorios).
// Simple y suficiente para 10-50 clientes.
export function startPlatformScheduler() {
  if (!config.jobs.enabled) {
    console.log('[scheduler] Jobs deshabilitados (JOBS_ENABLED=false).')
    return
  }

  const cronExpr = process.env.JOB_PLAN_LIFECYCLE || '0 9 * * *'

  cron.schedule(
    cronExpr,
    async () => {
      try {
        const result = await processPlanLifecycle()
        console.log(`[scheduler] Planes: ${result.expired} vencidos, ${result.reminded} recordatorios enviados.`)
      } catch (error) {
        console.error('[scheduler] Error en ciclo de vida de planes:', error?.message || error)
      }
    },
    { timezone: config.jobs.timezone },
  )

  console.log(`[scheduler] Ciclo de vida de planes programado (${cronExpr}).`)
}
