import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const monitors = sqliteTable('monitors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type', { enum: ['http', 'tcp'] }).notNull().default('http'),
  intervalSeconds: integer('interval_seconds').notNull().default(60),
  timeoutSeconds: integer('timeout_seconds').notNull().default(30),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
})

export const heartbeats = sqliteTable('heartbeats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitorId: integer('monitor_id')
    .notNull()
    .references(() => monitors.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['up', 'down', 'pending'] }).notNull().default('pending'),
  responseTimeMs: integer('response_time_ms'),
  checkedAt: integer('checked_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  message: text('message')
})

export const monitorsRelations = relations(monitors, ({ many }) => ({
  heartbeats: many(heartbeats)
}))

export const heartbeatsRelations = relations(heartbeats, ({ one }) => ({
  monitor: one(monitors, {
    fields: [heartbeats.monitorId],
    references: [monitors.id]
  })
}))

export type Monitor = typeof monitors.$inferSelect
export type NewMonitor = typeof monitors.$inferInsert
export type Heartbeat = typeof heartbeats.$inferSelect
export type NewHeartbeat = typeof heartbeats.$inferInsert
