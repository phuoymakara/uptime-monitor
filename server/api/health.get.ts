import { db } from '../db/index'
import { monitors, heartbeats } from '../db/schema'
import { count } from 'drizzle-orm'

export default defineEventHandler(async () => {
  try {
    const monitorCount = db.select({ count: count() }).from(monitors).get()
    const heartbeatCount = db.select({ count: count() }).from(heartbeats).get()

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      monitors: monitorCount?.count ?? 0,
      heartbeats: heartbeatCount?.count ?? 0
    }
  } catch (err: any) {
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: err.message
    }
  }
})
