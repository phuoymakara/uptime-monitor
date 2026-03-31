import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const src = resolve(root, 'data/sqlite.db')
const backupDir = resolve(root, 'data/backups')

if (!existsSync(src)) {
  console.log('[Backup] No database file found at data/sqlite.db — nothing to backup.')
  process.exit(0)
}

mkdirSync(backupDir, { recursive: true })

// Create timestamp: YYYY-MM-DD_HH-MM-SS
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
const dest = resolve(backupDir, `sqlite-${ts}.db`)

try {
  copyFileSync(src, dest)
  const stats = statSync(dest)
  const sizeKB = Math.round(stats.size / 1024)
  console.log(`[Backup] Database backed up successfully:`)
  console.log(`  Source:      ${src}`)
  console.log(`  Destination: ${dest}`)
  console.log(`  Size:        ${sizeKB} KB`)

  // List existing backups
  const backups = readdirSync(backupDir)
    .filter(f => f.startsWith('sqlite-') && f.endsWith('.db'))
    .sort()
  console.log(`[Backup] Total backups available: ${backups.length}`)

  // Warn if keeping too many backups
  if (backups.length > 20) {
    console.log(`[Backup] Warning: ${backups.length} backups exist. Consider removing old ones from data/backups/`)
  }
} catch (err) {
  console.error('[Backup] Failed to backup database:', err.message)
  process.exit(1)
}
