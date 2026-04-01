import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { resolve } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'

const dataDir = resolve(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = resolve(dataDir, 'sqlite.db')
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Create tables if they don't exist — works in both dev and production
// (avoids relying on the drizzle/migrations folder being present in the build output)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS monitors (
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name             TEXT    NOT NULL,
    url              TEXT    NOT NULL,
    type             TEXT    NOT NULL DEFAULT 'http',
    interval_seconds INTEGER NOT NULL DEFAULT 60,
    timeout_seconds  INTEGER NOT NULL DEFAULT 30,
    enabled          INTEGER NOT NULL DEFAULT true,
    created_at       INTEGER,
    updated_at       INTEGER
  );

  CREATE TABLE IF NOT EXISTS heartbeats (
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    monitor_id       INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    status           TEXT    NOT NULL DEFAULT 'pending',
    response_time_ms INTEGER,
    checked_at       INTEGER,
    message          TEXT
  );
`)

console.log('[DB] Tables ready')

export const db = drizzle(sqlite, { schema })
export { sqlite }
