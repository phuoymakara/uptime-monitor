import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Users

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Sessions

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Monitors

export const monitors = sqliteTable('monitors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type', { enum: ['http', 'tcp'] }).notNull().default('http'),
  intervalSeconds: integer('interval_seconds').notNull().default(60),
  timeoutSeconds: integer('timeout_seconds').notNull().default(30),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  visibility: text('visibility', { enum: ['public', 'private'] }).notNull().default('public'),
  regions: text('regions').default('[]'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  // Scheduling fields — source of truth for the global tick loop
  nextCheckAt: integer('next_check_at'),    // Unix ms; NULL = not yet scheduled
  lastCheckedAt: integer('last_checked_at'), // Unix ms of last completed check claim
  lastStatus: text('last_status'),           // NULL = no check completed yet (skip notification)
}, (t) => ({
  userIdIdx:    index('monitors_user_id_idx').on(t.userId),
  visibilityIdx: index('monitors_visibility_idx').on(t.visibility),
  nextCheckIdx: index('monitors_next_check_idx').on(t.enabled, t.nextCheckAt),
}))

// Heartbeats

export const heartbeats = sqliteTable('heartbeats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitorId: integer('monitor_id')
    .notNull()
    .references(() => monitors.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['up', 'down', 'pending'] }).notNull().default('pending'),
  responseTimeMs: integer('response_time_ms'),
  durationMs: integer('duration_ms'),
  checkedAt: integer('checked_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  message: text('message'),
  region: text('region').default('local'),
  failures: integer('failures').default(0),
}, (t) => ({
  // Covers unfiltered monitor queries (stats, pruning)
  monitorCheckedAtIdx: index('heartbeats_monitor_checked_idx').on(t.monitorId, t.checkedAt),
  // Covers region-filtered queries (chart, recent checks, stats by region)
  monitorRegionIdx: index('heartbeats_monitor_region_idx').on(t.monitorId, t.region, t.checkedAt),
}))

// Heartbeat Summaries (tiered rollup for long-term history)

export const heartbeatSummaries = sqliteTable('heartbeat_summaries', {
  monitorId:   integer('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  bucket:      text('bucket').notNull(),
  bucketType:  text('bucket_type').notNull().$type<'hour' | 'day' | 'month'>(),
  region:      text('region').notNull().default('local'),
  checkCount:  integer('check_count').notNull(),
  upCount:     integer('up_count').notNull(),
  downCount:   integer('down_count').notNull(),
  avgResponse: real('avg_response').notNull(),
}, (t) => ({
  pk:        primaryKey({ columns: [t.monitorId, t.bucketType, t.bucket, t.region] }),
  lookupIdx: index('idx_summaries_lookup').on(t.monitorId, t.bucketType, t.region, t.bucket),
}))

// Settings

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey().notNull(),
  value: text('value').notNull(),
})

// Relations ─

export const usersRelations = relations(users, ({ many }) => ({
  monitors: many(monitors),
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const monitorsRelations = relations(monitors, ({ one, many }) => ({
  user: one(users, { fields: [monitors.userId], references: [users.id] }),
  heartbeats: many(heartbeats),
  heartbeatSummaries: many(heartbeatSummaries),
}))

export const heartbeatsRelations = relations(heartbeats, ({ one }) => ({
  monitor: one(monitors, { fields: [heartbeats.monitorId], references: [monitors.id] }),
}))

export const heartbeatSummariesRelations = relations(heartbeatSummaries, ({ one }) => ({
  monitor: one(monitors, { fields: [heartbeatSummaries.monitorId], references: [monitors.id] }),
}))

// Types

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Monitor = typeof monitors.$inferSelect
export type NewMonitor = typeof monitors.$inferInsert
export type Heartbeat = typeof heartbeats.$inferSelect
export type NewHeartbeat = typeof heartbeats.$inferInsert
export type HeartbeatSummary = typeof heartbeatSummaries.$inferSelect
export type NewHeartbeatSummary = typeof heartbeatSummaries.$inferInsert
