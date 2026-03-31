import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const dataDir = resolve(root, 'data')
const migrationsDir = resolve(root, 'drizzle/migrations')

mkdirSync(dataDir, { recursive: true })

if (!existsSync(migrationsDir)) {
  console.error('[Migrate] No migrations folder found at drizzle/migrations/')
  console.error('[Migrate] Run "yarn db:generate" first to generate migrations.')
  process.exit(1)
}

const Database = require('better-sqlite3')
const { drizzle } = require('drizzle-orm/better-sqlite3')
const { migrate } = require('drizzle-orm/better-sqlite3/migrator')

const dbPath = resolve(dataDir, 'sqlite.db')
console.log(`[Migrate] Connecting to database: ${dbPath}`)

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite)

try {
  migrate(db, { migrationsFolder: migrationsDir })
  console.log('[Migrate] All migrations applied successfully.')
} catch (err) {
  console.error('[Migrate] Migration failed:', err.message)
  sqlite.close()
  process.exit(1)
}

sqlite.close()
console.log('[Migrate] Database connection closed.')
