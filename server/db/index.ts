import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { resolve } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'

const dataDir = resolve(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = resolve(dataDir, 'sqlite.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Run migrations on startup
try {
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle/migrations') })
  console.log('[DB] Migrations applied successfully')
} catch (err) {
  console.error('[DB] Migration error:', err)
}

export { sqlite }
