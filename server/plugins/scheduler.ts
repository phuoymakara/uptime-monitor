import { db } from '../db/index'
import { monitors, heartbeats } from '../db/schema'
import { eq } from 'drizzle-orm'
import { performCheck } from '../utils/checker'

// Track timers per monitor
const monitorTimers = new Map<number, ReturnType<typeof setInterval>>()

async function checkMonitor(monitorId: number) {
  try {
    const monitor = db.select().from(monitors).where(eq(monitors.id, monitorId)).get()

    if (!monitor || !monitor.enabled) {
      stopMonitor(monitorId)
      return
    }

    const result = await performCheck(
      monitor.type as 'http' | 'tcp',
      monitor.url,
      monitor.timeoutSeconds
    )

    db.insert(heartbeats).values({
      monitorId: monitor.id,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      checkedAt: new Date(),
      message: result.message
    }).run()

    // Keep only last 1000 heartbeats per monitor to prevent unbounded growth
    const countResult = db.select().from(heartbeats)
      .where(eq(heartbeats.monitorId, monitorId))
      .all()

    if (countResult.length > 1000) {
      const sorted = countResult.sort((a, b) =>
        (a.checkedAt?.getTime() ?? 0) - (b.checkedAt?.getTime() ?? 0)
      )
      const toDelete = sorted.slice(0, sorted.length - 1000)
      for (const hb of toDelete) {
        db.delete(heartbeats).where(eq(heartbeats.id, hb.id)).run()
      }
    }
  } catch (err) {
    console.error(`[Scheduler] Error checking monitor ${monitorId}:`, err)
  }
}

function startMonitor(monitorId: number, intervalSeconds: number) {
  stopMonitor(monitorId)
  // Run immediately
  checkMonitor(monitorId)
  // Then on interval
  const timer = setInterval(() => checkMonitor(monitorId), intervalSeconds * 1000)
  monitorTimers.set(monitorId, timer)
}

function stopMonitor(monitorId: number) {
  const timer = monitorTimers.get(monitorId)
  if (timer) {
    clearInterval(timer)
    monitorTimers.delete(monitorId)
  }
}

export function scheduleMonitor(monitorId: number, intervalSeconds: number, enabled: boolean) {
  if (enabled) {
    startMonitor(monitorId, intervalSeconds)
  } else {
    stopMonitor(monitorId)
  }
}

export function unscheduleMonitor(monitorId: number) {
  stopMonitor(monitorId)
}

export default defineNitroPlugin(async () => {
  console.log('[Scheduler] Starting monitoring scheduler...')

  try {
    const allMonitors = db.select().from(monitors).all()
    let started = 0

    for (const monitor of allMonitors) {
      if (monitor.enabled) {
        startMonitor(monitor.id, monitor.intervalSeconds)
        started++
      }
    }

    console.log(`[Scheduler] Started ${started} monitor(s) out of ${allMonitors.length} total`)
  } catch (err) {
    console.error('[Scheduler] Failed to initialize scheduler:', err)
  }
})
