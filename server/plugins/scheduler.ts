import { db } from '../db/index'
import { monitors, heartbeats } from '../db/schema'
import { eq } from 'drizzle-orm'
import { performCheck } from '../utils/checker'
import { readSettings } from '../utils/settings'
import { sendNotification } from '../utils/notify'

// Track timers per monitor
const monitorTimers = new Map<number, ReturnType<typeof setInterval>>()

// Track last known status to detect changes
const previousStatus = new Map<number, string>()

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

    // Keep only last 100 heartbeats per monitor to prevent unbounded growth
    const countResult = db.select().from(heartbeats)
      .where(eq(heartbeats.monitorId, monitorId))
      .all()

    if (countResult.length > 100) {
      const sorted = countResult.sort((a, b) =>
        (a.checkedAt?.getTime() ?? 0) - (b.checkedAt?.getTime() ?? 0)
      )
      const toDelete = sorted.slice(0, sorted.length - 100)
      for (const hb of toDelete) {
        db.delete(heartbeats).where(eq(heartbeats.id, hb.id)).run()
      }
    }

    // Detect status change and fire webhook
    const newStatus = result.status
    const prevStatus = previousStatus.get(monitorId)
    previousStatus.set(monitorId, newStatus)

    const isAlertableChange =
      prevStatus !== undefined &&
      prevStatus !== newStatus &&
      (newStatus === 'down' || newStatus === 'up')

    if (isAlertableChange) {
      const settings = readSettings()
      const hasNotify = settings.webhookType === 'telegram'
        ? (settings.telegramBotToken && settings.telegramChatId)
        : settings.webhookUrl
      if (hasNotify) {
        sendNotification(
          settings,
          { name: monitor.name, url: monitor.url },
          newStatus as 'down' | 'up',
          result.message
        ).catch(() => {})
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
        // Seed previousStatus from the latest heartbeat so we don't false-trigger on boot
        const latest = db.select().from(heartbeats)
          .where(eq(heartbeats.monitorId, monitor.id))
          .all()
          .sort((a, b) => (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0))[0]

        if (latest) previousStatus.set(monitor.id, latest.status)

        startMonitor(monitor.id, monitor.intervalSeconds)
        started++
      }
    }

    console.log(`[Scheduler] Started ${started} monitor(s) out of ${allMonitors.length} total`)
  } catch (err) {
    console.error('[Scheduler] Failed to initialize scheduler:', err)
  }
})
