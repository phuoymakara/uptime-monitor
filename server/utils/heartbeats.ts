import { db, sqlite } from '../db/index'
import { heartbeats } from '../db/schema'
import { eq, desc, gte, and, sql, inArray, ne } from 'drizzle-orm'

export interface UptimeStats {
  uptime24h: number | null
  uptime7d: number | null
  uptime30d: number | null
}

const pct = (upMs: number | null, totalMs: number | null): number | null =>
  totalMs ? Math.round(((upMs ?? 0) / totalMs) * 1000) / 10 : null

// ─── Single-monitor ──────────────────────────────────────────────────────────

/**
 * Time-weighted uptime: SUM(duration_ms where up) / SUM(duration_ms).
 * Rows without duration_ms (first heartbeat per monitor) are excluded from
 * both numerator and denominator — they don't skew the result.
 */
export function calcUptimeStats(monitorId: number): UptimeStats {
  const now   = Date.now()
  const ms30d = now - 30 * 24 * 60 * 60 * 1000
  const ms7d  = now -  7 * 24 * 60 * 60 * 1000
  const ms24h = now -      24 * 60 * 60 * 1000
  // checked_at is stored as Unix seconds (mode: 'timestamp'), so convert thresholds
  const s7d  = Math.floor(ms7d  / 1000)
  const s24h = Math.floor(ms24h / 1000)

  const row = db.select({
    totalMs30d: sql<number>`SUM(${heartbeats.durationMs})`,
    upMs30d:    sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' THEN ${heartbeats.durationMs} END)`,
    totalMs7d:  sql<number>`SUM(CASE WHEN ${heartbeats.checkedAt} >= ${s7d} THEN ${heartbeats.durationMs} END)`,
    upMs7d:     sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' AND ${heartbeats.checkedAt} >= ${s7d} THEN ${heartbeats.durationMs} END)`,
    totalMs24h: sql<number>`SUM(CASE WHEN ${heartbeats.checkedAt} >= ${s24h} THEN ${heartbeats.durationMs} END)`,
    upMs24h:    sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' AND ${heartbeats.checkedAt} >= ${s24h} THEN ${heartbeats.durationMs} END)`,
  })
    .from(heartbeats)
    .where(and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.checkedAt, new Date(ms30d)), eq(heartbeats.region, 'local')))
    .get()

  return {
    uptime24h: pct(row?.upMs24h ?? null, row?.totalMs24h ?? null),
    uptime7d:  pct(row?.upMs7d  ?? null, row?.totalMs7d  ?? null),
    uptime30d: pct(row?.upMs30d ?? null, row?.totalMs30d ?? null),
  }
}

/**
 * Fetches the N most recent heartbeats (oldest-first for chart rendering).
 * Returns latest separately so callers don't need a second query.
 */
export function getRecentHeartbeats(monitorId: number, limit = 10) {
  const rows = db.select()
    .from(heartbeats)
    .where(and(eq(heartbeats.monitorId, monitorId), eq(heartbeats.region, 'local')))
    .orderBy(desc(heartbeats.checkedAt))
    .limit(limit)
    .all()

  return {
    latest: rows[0] ?? null,
    recent: rows.slice().reverse(),
  }
}

// ─── Batch (N+1 fix) ─────────────────────────────────────────────────────────

/**
 * Time-weighted uptime for multiple monitors in one SQL query (GROUP BY).
 */
export function calcUptimeStatsBatch(monitorIds: number[]): Record<number, UptimeStats> {
  if (monitorIds.length === 0) return {}

  const now   = Date.now()
  const ms30d = now - 30 * 24 * 60 * 60 * 1000
  const ms7d  = now -  7 * 24 * 60 * 60 * 1000
  const ms24h = now -      24 * 60 * 60 * 1000
  // checked_at is stored as Unix seconds (mode: 'timestamp'), so convert thresholds
  const s7d  = Math.floor(ms7d  / 1000)
  const s24h = Math.floor(ms24h / 1000)

  const rows = db.select({
    monitorId:  heartbeats.monitorId,
    totalMs30d: sql<number>`SUM(${heartbeats.durationMs})`,
    upMs30d:    sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' THEN ${heartbeats.durationMs} END)`,
    totalMs7d:  sql<number>`SUM(CASE WHEN ${heartbeats.checkedAt} >= ${s7d} THEN ${heartbeats.durationMs} END)`,
    upMs7d:     sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' AND ${heartbeats.checkedAt} >= ${s7d} THEN ${heartbeats.durationMs} END)`,
    totalMs24h: sql<number>`SUM(CASE WHEN ${heartbeats.checkedAt} >= ${s24h} THEN ${heartbeats.durationMs} END)`,
    upMs24h:    sql<number>`SUM(CASE WHEN ${heartbeats.status} = 'up' AND ${heartbeats.checkedAt} >= ${s24h} THEN ${heartbeats.durationMs} END)`,
  })
    .from(heartbeats)
    .where(and(inArray(heartbeats.monitorId, monitorIds), gte(heartbeats.checkedAt, new Date(ms30d)), eq(heartbeats.region, 'local')))
    .groupBy(heartbeats.monitorId)
    .all()

  const result: Record<number, UptimeStats> = {}
  for (const row of rows) {
    result[row.monitorId] = {
      uptime24h: pct(row.upMs24h, row.totalMs24h),
      uptime7d:  pct(row.upMs7d,  row.totalMs7d),
      uptime30d: pct(row.upMs30d, row.totalMs30d),
    }
  }
  return result
}

/**
 * Fetches the last N heartbeats for multiple monitors in a single SQL query
 * using a window function (ROW_NUMBER PARTITION BY monitor_id).
 */
export function getRecentHeartbeatsBatch(monitorIds: number[], limit = 10) {
  if (monitorIds.length === 0) return {} as Record<number, { latest: any; recent: any[] }>

  const placeholders = monitorIds.map(() => '?').join(', ')
  const rows = sqlite.prepare(`
    SELECT id,
           monitor_id       AS monitorId,
           status,
           response_time_ms AS responseTimeMs,
           duration_ms      AS durationMs,
           checked_at       AS checkedAt,
           message
    FROM (
      SELECT *,
             ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) AS rn
      FROM heartbeats
      WHERE monitor_id IN (${placeholders}) AND region = 'local'
    )
    WHERE rn <= ?
    ORDER BY monitorId, checkedAt ASC
  `).all(...monitorIds, limit) as Array<{
    id: number
    monitorId: number
    status: 'up' | 'down' | 'pending'
    responseTimeMs: number | null
    durationMs: number | null
    checkedAt: number | null
    message: string | null
  }>

  const result: Record<number, { latest: any; recent: any[] }> = {}
  for (const id of monitorIds) result[id] = { latest: null, recent: [] }

  for (const row of rows) {
    const mapped = { ...row, checkedAt: row.checkedAt != null ? new Date(row.checkedAt) : null }
    result[row.monitorId].recent.push(mapped)
  }

  for (const id of monitorIds) {
    const g = result[id]
    g.latest = g.recent[g.recent.length - 1] ?? null
  }

  return result
}

// ─── Summary rollup ──────────────────────────────────────────────────────────

export interface SummaryBucket {
  bucket: string
  checkCount: number
  upCount: number
  downCount: number
  avgResponse: number
}

/**
 * Aggregates raw heartbeats into daily `heartbeat_summaries` rows.
 * Safe to run repeatedly — uses INSERT OR REPLACE.
 * Only processes completed days (before today UTC).
 */
export function runNightlyRollup() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayMs = startOfToday.getTime()

  try {
    const upsert = sqlite.prepare(`
      INSERT OR REPLACE INTO heartbeat_summaries
        (monitor_id, bucket, bucket_type, region, check_count, up_count, down_count, avg_response)
      SELECT
        monitor_id,
        strftime('%Y-%m-%d', datetime(checked_at / 1000, 'unixepoch')) AS bucket,
        'day'                                                           AS bucket_type,
        COALESCE(region, 'local')                                       AS region,
        COUNT(*)                                                        AS check_count,
        SUM(CASE WHEN status = 'up'   THEN 1 ELSE 0 END)               AS up_count,
        SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END)               AS down_count,
        COALESCE(AVG(CASE WHEN response_time_ms IS NOT NULL
                          THEN CAST(response_time_ms AS REAL) END), 0.0) AS avg_response
      FROM heartbeats
      WHERE checked_at IS NOT NULL AND checked_at < ?
      GROUP BY monitor_id, bucket, region
    `).run(todayMs)

    // Prune daily summaries older than 2 years
    const cutoff = new Date()
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2)
    sqlite.prepare(`
      DELETE FROM heartbeat_summaries WHERE bucket_type = 'day' AND bucket < ?
    `).run(cutoff.toISOString().slice(0, 10))

    console.log(`[Rollup] Daily summaries upserted: ${(upsert as any).changes} row(s)`)
  } catch (err) {
    console.error('[Rollup] Failed:', err)
  }
}

/**
 * Returns daily summary buckets for multiple monitors, ordered oldest-first.
 */
export function getSummaryBucketsBatch(monitorIds: number[], days: number) {
  if (monitorIds.length === 0) return {} as Record<number, SummaryBucket[]>

  const startDate = new Date()
  startDate.setUTCDate(startDate.getUTCDate() - days)
  const startDateStr = startDate.toISOString().slice(0, 10)

  const placeholders = monitorIds.map(() => '?').join(', ')
  const rows = sqlite.prepare(`
    SELECT monitor_id AS monitorId, bucket,
           check_count AS checkCount, up_count AS upCount,
           down_count  AS downCount, avg_response AS avgResponse
    FROM heartbeat_summaries
    WHERE bucket_type = 'day'
      AND region = 'local'
      AND monitor_id IN (${placeholders})
      AND bucket >= ?
    ORDER BY monitorId, bucket ASC
  `).all(...monitorIds, startDateStr) as Array<SummaryBucket & { monitorId: number }>

  const result: Record<number, SummaryBucket[]> = {}
  for (const id of monitorIds) result[id] = []
  for (const row of rows) {
    result[row.monitorId]?.push({
      bucket: row.bucket, checkCount: row.checkCount,
      upCount: row.upCount, downCount: row.downCount, avgResponse: row.avgResponse,
    })
  }
  return result
}

export function getLatestPerRegion(monitorId: number) {
  return sqlite.prepare(`
    SELECT region, status, response_time_ms AS responseTimeMs, checked_at AS checkedAt, message
    FROM (
      SELECT *,
             ROW_NUMBER() OVER (PARTITION BY region ORDER BY checked_at DESC) AS rn
      FROM heartbeats
      WHERE monitor_id = ? AND region != 'local'
    )
    WHERE rn = 1
    ORDER BY region
  `).all(monitorId) as Array<{
    region: string
    status: 'up' | 'down' | 'pending'
    responseTimeMs: number | null
    checkedAt: number | null
    message: string | null
  }>
}
