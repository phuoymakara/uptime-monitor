import { db } from '../../db/index'
import { monitors } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { getSummaryBucketsBatch } from '../../utils/heartbeats'

export default defineEventHandler((event) => {
  try {
    const query  = getQuery(event)
    const range  = (query.range as string) === '90d' ? '90d' : '30d'
    const days   = range === '90d' ? 90 : 30

    const publicMonitors = db.select({ id: monitors.id })
      .from(monitors)
      .where(eq(monitors.visibility, 'public'))
      .all()

    if (publicMonitors.length === 0) return []

    const monitorIds  = publicMonitors.map(m => m.id)
    const bucketsMap  = getSummaryBucketsBatch(monitorIds, days)

    setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

    return monitorIds.map(id => {
      const buckets     = bucketsMap[id] ?? []
      const totalChecks = buckets.reduce((s, b) => s + b.checkCount, 0)
      const totalUp     = buckets.reduce((s, b) => s + b.upCount,    0)
      const uptimePct   = totalChecks > 0
        ? Math.round((totalUp / totalChecks) * 1000) / 10
        : null

      return { monitorId: id, uptimePct, buckets }
    })
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
