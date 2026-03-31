import { db } from '../../db/index'
import { monitors, heartbeats } from '../../db/schema'
import { eq, desc, gte, and } from 'drizzle-orm'

export default defineEventHandler(async () => {
  try {
    const allMonitors = db.select().from(monitors).orderBy(monitors.createdAt).all()

    const result = await Promise.all(allMonitors.map(async (monitor) => {
      // Get latest heartbeat
      const latestHeartbeat = db.select()
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, monitor.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(1)
        .all()[0] || null

      // Calculate uptime for 24h, 7d, 30d
      const now = new Date()
      const day24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const calcUptime = (since: Date) => {
        const hbs = db.select()
          .from(heartbeats)
          .where(
            and(
              eq(heartbeats.monitorId, monitor.id),
              gte(heartbeats.checkedAt, since)
            )
          )
          .all()

        if (hbs.length === 0) return null
        const upCount = hbs.filter(h => h.status === 'up').length
        return Math.round((upCount / hbs.length) * 1000) / 10
      }

      // Get last 90 heartbeats for the uptime bar
      const recentHeartbeats = db.select()
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, monitor.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(90)
        .all()
        .reverse()

      return {
        ...monitor,
        latestHeartbeat,
        uptime24h: calcUptime(day24),
        uptime7d: calcUptime(day7),
        uptime30d: calcUptime(day30),
        recentHeartbeats
      }
    }))

    return result
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
